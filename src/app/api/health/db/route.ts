import { NextResponse } from "next/server";
import { hasUsableDatabaseUrl, prisma } from "@/lib/prisma";

export async function GET() {
  if (!hasUsableDatabaseUrl()) {
    return NextResponse.json(
      {
        ok: false,
        database: "unconfigured",
        error: "DATABASE_URL no está configurada con un valor PostgreSQL real.",
      },
      { status: 503 },
    );
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true, database: "reachable" });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        database: "unreachable",
        error: error instanceof Error ? error.message : "No fue posible conectar con PostgreSQL.",
      },
      { status: 503 },
    );
  }
}
