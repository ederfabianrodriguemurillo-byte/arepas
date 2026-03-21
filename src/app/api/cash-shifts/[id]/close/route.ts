import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { resolveShiftStatus, summarizeShift } from "@/lib/cash-shifts";
import { prisma } from "@/lib/prisma";
import { cashShiftCloseSchema } from "@/lib/schemas";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const shift = await prisma.cashShift.findUnique({
      where: { id },
      include: { movements: true, sales: true },
    });

    if (!shift || shift.closedAt) {
      return NextResponse.json({ error: "El turno ya está cerrado o no existe." }, { status: 400 });
    }
    if (shift.userId !== user.id && user.rol === "CASHIER") {
      return NextResponse.json({ error: "No puedes cerrar el turno de otro cajero." }, { status: 403 });
    }

    const payload = cashShiftCloseSchema.parse(await request.json());
    const summary = summarizeShift(shift);
    const difference = payload.closingAmountCounted - summary.expectedCash;
    const status = resolveShiftStatus(difference);

    const updated = await prisma.cashShift.update({
      where: { id },
      data: {
        closedAt: new Date(),
        closingAmountExpected: summary.expectedCash,
        closingAmountCounted: payload.closingAmountCounted,
        deliveredAmount: payload.deliveredAmount,
        difference,
        status,
        receivedBy: payload.receivedBy,
        notes: payload.notes || null,
      },
    });

    return NextResponse.json({ shift: updated });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo cerrar el turno." }, { status: 400 });
  }
}
