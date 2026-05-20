import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const g = globalThis as unknown as { prisma?: PrismaClient; pgPool?: Pool };

function getPool() {
  if (!g.pgPool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error("DATABASE_URL is required.");
    g.pgPool = new Pool({ connectionString, max: 5, idleTimeoutMillis: 30_000 });
  }
  return g.pgPool;
}

function createPrismaClient() {
  return new PrismaClient({ adapter: new PrismaPg(getPool()) });
}

export const prisma = g.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  g.prisma = prisma;
}
