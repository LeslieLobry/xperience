// lib/prisma.js
import { PrismaClient } from "@prisma/client";
console.log("🔍 DATABASE_URL =", process.env.DATABASE_URL);
const globalForPrisma = globalThis;

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["warn", "error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
