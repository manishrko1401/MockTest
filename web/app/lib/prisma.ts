import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const connectionString = process.env.DATABASE_URL ? process.env.DATABASE_URL.trim() : undefined;

let prismaInstance: PrismaClient;

if (globalForPrisma.prisma && (globalForPrisma.prisma as any).contactInquiry) {
  prismaInstance = globalForPrisma.prisma;
} else {
  const pool = new Pool({
    connectionString,
    connectionTimeoutMillis: 30000, // 30s timeout to handle Supabase cold starts
    // PERF: keep idle connections for 5 min. Re-opening a TLS connection to the Supabase
    // pooler costs several round trips (~1s from India), which every request paid after
    // any 30s pause. The pooler (pgbouncer) handles long-lived idle clients fine.
    idleTimeoutMillis: 5 * 60 * 1000,
    keepAlive: true,
    max: 5,                         // max 5 connections in pool
  });
  const adapter = new PrismaPg(pool);
  prismaInstance = new PrismaClient({
    adapter,
    log: ['error', 'warn'],
  });
  globalForPrisma.prisma = prismaInstance;
}

export const prisma = prismaInstance;
