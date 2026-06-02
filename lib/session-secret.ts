const DEV_SESSION_SECRET = "dev-secret-key-change-in-production";

type SessionSecretEnv = {
  NODE_ENV?: string;
  SESSION_SECRET?: string;
};

export function resolveSessionSecret(env: SessionSecretEnv = process.env) {
  if (env.SESSION_SECRET) {
    return env.SESSION_SECRET;
  }

  if (env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET is required in production");
  }

  return DEV_SESSION_SECRET;
}

export function getEncodedSessionKey() {
  return new TextEncoder().encode(resolveSessionSecret());
}
