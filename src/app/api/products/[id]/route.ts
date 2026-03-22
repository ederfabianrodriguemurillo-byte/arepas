import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { revalidateCatalog } from "@/lib/cache";
import { prisma } from "@/lib/prisma";
import { productSchema } from "@/lib/schemas";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const payload = productSchema.parse(await request.json());
    const { id } = await params;
    const product = await prisma.$transaction(async (tx) => {
      await tx.productVariant.deleteMany({ where: { productId: id } });
      return tx.product.update({
        where: { id },
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
    });
    revalidateCatalog();
    return NextResponse.json({ product });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo actualizar el producto." }, { status: 400 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({
        where: { id },
        select: {
          id: true,
          activo: true,
          _count: {
            select: {
              saleItems: true,
            },
          },
        },
      });

      if (!product) {
        throw new Error("El producto no existe.");
      }

      if (product._count.saleItems > 0) {
        await tx.product.update({
          where: { id },
          data: {
            activo: false,
          },
        });

        return {
          archived: true,
          message: "El producto tiene ventas asociadas. Se desactivó en lugar de eliminarse.",
        };
      }

      await tx.productVariant.deleteMany({ where: { productId: id } });
      await tx.product.delete({ where: { id } });

      return {
        archived: false,
        message: "Producto eliminado correctamente.",
      };
    });

    revalidateCatalog();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo eliminar el producto." }, { status: 400 });
  }
}
