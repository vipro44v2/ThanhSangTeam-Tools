type DatabaseUrlEnv = {
  DATABASE_URL?: string;
  POSTGRES_PRISMA_URL?: string;
  POSTGRES_URL?: string;
} & Record<string, string | undefined>;

export function resolveDatabaseUrl(env: DatabaseUrlEnv = process.env) {
  const connectionString = env.DATABASE_URL ?? env.POSTGRES_PRISMA_URL ?? env.POSTGRES_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL, POSTGRES_PRISMA_URL, or POSTGRES_URL is required.");
  }

  return connectionString;
}
