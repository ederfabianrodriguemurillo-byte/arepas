import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getOpenShiftForUser } from "@/lib/cash-shifts";
import { prisma } from "@/lib/prisma";
import { cashShiftOpenSchema } from "@/lib/schemas";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const existing = await getOpenShiftForUser(user.id);
    if (existing) {
      return NextResponse.json({ error: "Ya tienes un turno abierto." }, { status: 400 });
    }

    const payload = cashShiftOpenSchema.parse(await request.json());
    const shift = await prisma.cashShift.create({
      data: {
        userId: user.id,
        openingAmount: payload.openingAmount,
      },
    });

    return NextResponse.json({ shift });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo abrir el turno." }, { status: 400 });
  }
}
