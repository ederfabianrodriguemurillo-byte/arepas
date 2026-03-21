import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getOpenShiftForUser, summarizeShift } from "@/lib/cash-shifts";
import { prisma } from "@/lib/prisma";
import { cashMovementSchema } from "@/lib/schemas";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const shift = await prisma.cashShift.findUnique({ where: { id } });
    if (!shift || shift.closedAt) {
      return NextResponse.json({ error: "El turno no está disponible para movimientos." }, { status: 400 });
    }
    if (shift.userId !== user.id && user.rol === "CASHIER") {
      return NextResponse.json({ error: "No puedes registrar movimientos en otro turno." }, { status: 403 });
    }

    const payload = cashMovementSchema.parse(await request.json());
    await prisma.cashMovement.create({
      data: {
        shiftId: id,
        type: payload.type,
        amount: payload.amount,
        description: payload.description,
        createdById: user.id,
      },
    });

    const currentShift = await getOpenShiftForUser(shift.userId);
    return NextResponse.json({ shift: currentShift, summary: currentShift ? summarizeShift(currentShift) : null });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo registrar el movimiento." }, { status: 400 });
  }
}
