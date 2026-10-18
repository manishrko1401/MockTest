import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const globalForTypingPrisma = globalThis as unknown as {
  prismaTyping: PrismaClient | undefined;
};

// Use TYPING_DATABASE_URL if available; fallback gracefully to primary DATABASE_URL
const connectionString = (
  process.env.TYPING_DATABASE_URL ||
  process.env.DATABASE_URL ||
  ''
).trim();

let prismaTypingInstance: PrismaClient;

if (globalForTypingPrisma.prismaTyping) {
  prismaTypingInstance = globalForTypingPrisma.prismaTyping;
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
  prismaTypingInstance = new PrismaClient({
    adapter,
    log: ['error', 'warn'],
  });

  globalForTypingPrisma.prismaTyping = prismaTypingInstance;
}

export const prismaTyping = prismaTypingInstance;
