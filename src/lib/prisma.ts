import { PrismaClient } from "@prisma/client";

declare global {
  var prisma: PrismaClient | undefined;
}

function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export function hasUsableDatabaseUrl() {
  const value = process.env.DATABASE_URL?.trim() || "";
  if (!value) {
    return false;
  }

  const placeholders = ["USER", "PASSWORD", "HOST", "DBNAME"];
  const hasPlaceholder = placeholders.some((token) => value.includes(token));
  return !hasPlaceholder;
}

export const prisma = global.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}
