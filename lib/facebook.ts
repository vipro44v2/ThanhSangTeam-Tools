import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  randomUUID,
} from "node:crypto";
import { prisma } from "@/lib/prisma";

const DEFAULT_GRAPH_VERSION = "v20.0";

type FacebookPicture = {
  data?: {
    url?: string;
  };
};

type FacebookPageAccount = {
  id: string;
  name: string;
  access_token?: string;
  tasks?: string[];
  picture?: FacebookPicture;
};

type FacebookAccountsResponse = {
  data?: FacebookPageAccount[];
  paging?: {
    next?: string;
  };
  error?: {
    message?: string;
    type?: string;
    code?: number;
  };
};

type FacebookUserProfile = {
  id: string;
  name: string;
};

export type ImportedFacebookPage = {
  pageId: string;
  name: string;
  tasks: string[];
  pictureUrl?: string;
};

function graphVersion() {
  return process.env.FACEBOOK_GRAPH_VERSION || DEFAULT_GRAPH_VERSION;
}

function encryptionKey() {
  const secret = process.env.FACEBOOK_TOKEN_SECRET;

  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("FACEBOOK_TOKEN_SECRET is required in production");
    }

    console.warn(
      "FACEBOOK_TOKEN_SECRET is not set; using a development-only encryption key.",
    );
  }

  return createHash("sha256")
    .update(secret || "local-development-facebook-token-key")
    .digest();
}

export function encryptFacebookToken(token: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(token, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return `gcm:${iv.toString("base64")}:${authTag.toString(
    "base64",
  )}:${encrypted.toString("base64")}`;
}

export function decryptFacebookToken(encrypted: string): string {
  const parts = encrypted.split(":");
  if (parts.length !== 4 || parts[0] !== "gcm") {
    throw new Error("Invalid token format");
  }
  const [, ivB64, tagB64, encB64] = parts;
  const iv = Buffer.from(ivB64, "base64");
  const authTag = Buffer.from(tagB64, "base64");
  const encryptedData = Buffer.from(encB64, "base64");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encryptedData), decipher.final()]).toString("utf8");
}

export async function postToFacebookPage({
  pageId,
  accessToken,
  message,
  photoUrls,
}: {
  pageId: string;
  accessToken: string;
  message?: string;
  photoUrls?: string[];
}): Promise<string> {
  const version = graphVersion();

  if (!photoUrls || photoUrls.length === 0) {
    const body = new URLSearchParams({ access_token: accessToken });
    if (message) body.set("message", message);
    const res = await fetch(`https://graph.facebook.com/${version}/${pageId}/feed`, {
      method: "POST", body, cache: "no-store",
    });
    const data = (await res.json()) as { id?: string; error?: { message?: string } };
    if (!res.ok || data.error) throw new Error(data.error?.message ?? "Facebook API error");
    return data.id ?? "";
  }

  if (photoUrls.length === 1) {
    const body = new URLSearchParams({ access_token: accessToken, url: photoUrls[0] });
    if (message) body.set("message", message);
    const res = await fetch(`https://graph.facebook.com/${version}/${pageId}/photos`, {
      method: "POST", body, cache: "no-store",
    });
    const data = (await res.json()) as { id?: string; post_id?: string; error?: { message?: string } };
    if (!res.ok || data.error) throw new Error(data.error?.message ?? "Facebook API error");
    return data.post_id ?? data.id ?? "";
  }

  // Multiple photos: upload each unpublished, then create a feed post
  const photoIds = await Promise.all(
    photoUrls.map((url) => uploadUnpublishedPhoto(pageId, accessToken, url)),
  );

  const parts = [`access_token=${encodeURIComponent(accessToken)}`];
  if (message) parts.push(`message=${encodeURIComponent(message)}`);
  photoIds.forEach((id, i) => {
    parts.push(`attached_media[${i}]=${encodeURIComponent(JSON.stringify({ media_fbid: id }))}`);
  });

  const res = await fetch(`https://graph.facebook.com/${version}/${pageId}/feed`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: parts.join("&"),
    cache: "no-store",
  });
  const data = (await res.json()) as { id?: string; error?: { message?: string } };
  if (!res.ok || data.error) throw new Error(data.error?.message ?? "Facebook API error");
  return data.id ?? "";
}

async function uploadUnpublishedPhoto(
  pageId: string,
  accessToken: string,
  photoUrl: string,
): Promise<string> {
  const version = graphVersion();
  const body = new URLSearchParams({
    access_token: accessToken,
    url: photoUrl,
    published: "false",
  });
  const res = await fetch(`https://graph.facebook.com/${version}/${pageId}/photos`, {
    method: "POST", body, cache: "no-store",
  });
  const data = (await res.json()) as { id?: string; error?: { message?: string } };
  if (!res.ok || data.error) throw new Error(data.error?.message ?? "Facebook photo upload error");
  return data.id!;
}

async function readGraphJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    cache: "no-store",
  });
  const data = (await response.json()) as T & FacebookAccountsResponse;

  if (!response.ok || data.error) {
    const message = data.error?.message || `Facebook Graph error ${response.status}`;
    throw new Error(message);
  }

  return data as T;
}

export async function exchangeCodeForUserAccessToken(code: string) {
  const appId = process.env.FACEBOOK_APP_ID;
  const appSecret = process.env.FACEBOOK_APP_SECRET;
  const redirectUri = facebookRedirectUri();

  if (!appId || !appSecret || !redirectUri) {
    throw new Error("Missing Facebook OAuth environment variables");
  }

  const params = new URLSearchParams({
    client_id: appId,
    client_secret: appSecret,
    redirect_uri: redirectUri,
    code,
  });

  const tokenUrl = `https://graph.facebook.com/${graphVersion()}/oauth/access_token?${params.toString()}`;
  const data = await readGraphJson<{ access_token?: string }>(tokenUrl);

  if (!data.access_token) {
    throw new Error("Facebook did not return a user access token");
  }

  return data.access_token;
}

export function facebookRedirectUri() {
  return process.env.FACEBOOK_REDIRECT_URI;
}

export function facebookOAuthUrl(state: string) {
  const appId = process.env.FACEBOOK_APP_ID;
  const redirectUri = facebookRedirectUri();

  if (!appId || !redirectUri) {
    throw new Error("Missing FACEBOOK_APP_ID or FACEBOOK_REDIRECT_URI");
  }

  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    state,
    response_type: "code",
    scope: ["pages_show_list", "pages_read_engagement", "pages_manage_posts"].join(","),
  });

  return `https://www.facebook.com/${graphVersion()}/dialog/oauth?${params.toString()}`;
}

export async function fetchFacebookUserProfile(userAccessToken: string) {
  const profileUrl =
    `https://graph.facebook.com/${graphVersion()}/me?` +
    new URLSearchParams({
      fields: "id,name",
      access_token: userAccessToken,
    }).toString();

  return readGraphJson<FacebookUserProfile>(profileUrl);
}

export async function fetchFacebookPages(userAccessToken: string) {
  const pages: FacebookPageAccount[] = [];
  const fields = "id,name,access_token,tasks,picture{url}";
  let nextUrl =
    `https://graph.facebook.com/${graphVersion()}/me/accounts?` +
    new URLSearchParams({
      fields,
      limit: "100",
      access_token: userAccessToken,
    }).toString();

  while (nextUrl) {
    const data = await readGraphJson<FacebookAccountsResponse>(nextUrl);
    pages.push(...(data.data || []));
    nextUrl = data.paging?.next || "";
  }

  return pages.filter((page) => page.id && page.name && page.access_token);
}

export async function importFacebookPages(userAccessToken: string) {
  const profile = await fetchFacebookUserProfile(userAccessToken);
  const pages = await fetchFacebookPages(userAccessToken);
  const imported: ImportedFacebookPage[] = [];
  const now = new Date();
  const encryptedUserToken = encryptFacebookToken(userAccessToken);

  const facebookAccount = await prisma.facebook_accounts.upsert({
    where: {
      facebook_user_id: profile.id,
    },
    create: {
      id: randomUUID(),
      facebook_user_id: profile.id,
      facebook_user_name: profile.name,
      user_access_token_encrypted: encryptedUserToken,
      token_status: "active",
      updated_at: now,
    },
    update: {
      facebook_user_name: profile.name,
      user_access_token_encrypted: encryptedUserToken,
      token_status: "active",
      updated_at: now,
    },
  });

  await Promise.all(
    pages.map(async (page) => {
      try {
        const encryptedToken = encryptFacebookToken(page.access_token!);

        await prisma.facebook_pages.upsert({
          where: { page_id: page.id },
          create: {
            id: randomUUID(),
            facebook_account_id: facebookAccount.id,
            page_id: page.id,
            page_name: page.name,
            page_access_token_encrypted: encryptedToken,
            token_status: "active",
            updated_at: now,
          },
          update: {
            facebook_account_id: facebookAccount.id,
            page_name: page.name,
            page_access_token_encrypted: encryptedToken,
            token_status: "active",
            is_active: true,
            updated_at: now,
          },
        });

        imported.push({
          pageId: page.id,
          name: page.name,
          tasks: page.tasks || [],
          pictureUrl: page.picture?.data?.url,
        });
      } catch (err) {
        console.error(
          `[facebook] Failed to import page ${page.id} (${page.name}):`,
          err instanceof Error ? err.message : err,
        );
      }
    }),
  );

  return imported;
}
