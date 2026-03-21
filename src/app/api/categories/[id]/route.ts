import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { categorySchema } from "@/lib/schemas";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const payload = categorySchema.parse(await request.json());
    const { id } = await params;
    const category = await prisma.category.update({ where: { id }, data: payload });
    return NextResponse.json({ category });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo actualizar la categoría." }, { status: 400 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const productCount = await prisma.product.count({ where: { categoriaId: id } });
    if (productCount > 0) {
      return NextResponse.json({ error: "No puedes eliminar una categoría con productos asociados." }, { status: 400 });
    }
    await prisma.category.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo eliminar la categoría." }, { status: 400 });
  }
}
