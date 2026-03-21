import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getOpenShiftForUser } from "@/lib/cash-shifts";
import { prisma } from "@/lib/prisma";
import { saleSchema } from "@/lib/schemas";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const payload = saleSchema.parse(await request.json());
    const openShift = await getOpenShiftForUser(user.id);
    if (!openShift) {
      return NextResponse.json({ error: "Debes abrir caja antes de registrar ventas." }, { status: 400 });
    }
    const subtotal = payload.items.reduce((sum, item) => sum + item.precioUnitario * item.cantidad, 0);
    const montoRecibido = payload.metodoPago === "CASH" ? payload.montoRecibido || 0 : null;
    const cambio = payload.metodoPago === "CASH" ? Math.max((montoRecibido || 0) - subtotal, 0) : null;

    const sale = await prisma.$transaction(async (tx) => {
      const lastSale = await tx.sale.findFirst({
        orderBy: { numeroVenta: "desc" },
        select: { numeroVenta: true },
      });
      const numeroVenta = (lastSale?.numeroVenta || 0) + 1;

      return tx.sale.create({
        data: {
          numeroVenta,
          subtotal,
          total: subtotal,
          metodoPago: payload.metodoPago,
          montoRecibido,
          cambio,
          cajeroId: user.id,
          shiftId: openShift.id,
          items: {
            create: payload.items.map((item) => ({
              productId: item.productId,
              variantId: item.variantId || null,
              nombreProducto: item.nombreProducto,
              nombreVariante: item.nombreVariante || null,
              precioUnitario: item.precioUnitario,
              cantidad: item.cantidad,
              observacion: item.observacion || null,
              totalLinea: item.precioUnitario * item.cantidad,
            })),
          },
        },
        include: {
          cajero: { select: { nombre: true } },
          items: true,
        },
      });
    });

    return NextResponse.json({ sale });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo registrar la venta." }, { status: 400 });
  }
}
