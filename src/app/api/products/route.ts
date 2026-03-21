import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { productSchema } from "@/lib/schemas";

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const payload = productSchema.parse(await request.json());
    const product = await prisma.product.create({
      data: {
        nombre: payload.nombre,
        descripcion: payload.descripcion || "",
        precio: payload.precio,
        categoriaId: payload.categoriaId,
        imagenUrl: payload.imagenUrl || null,
        stock: payload.stock,
        activo: payload.activo,
        variants: {
          create: payload.variants.map((variant) => ({
            nombreVariante: variant.nombreVariante,
            precio: variant.precio,
          })),
        },
      },
    });
    return NextResponse.json({ product });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo crear el producto." }, { status: 400 });
  }
}
