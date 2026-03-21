import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { categorySchema } from "@/lib/schemas";

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const payload = categorySchema.parse(await request.json());
    const category = await prisma.category.create({ data: payload });
    return NextResponse.json({ category });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo crear la categoría." }, { status: 400 });
  }
}
