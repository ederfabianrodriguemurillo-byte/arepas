import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { settingsSchema } from "@/lib/schemas";

export async function PATCH(request: Request) {
  try {
    await requireAdmin();
    const payload = settingsSchema.parse(await request.json());
    const current = await prisma.businessSettings.findFirst();

    const settings = current
      ? await prisma.businessSettings.update({ where: { id: current.id }, data: payload })
      : await prisma.businessSettings.create({ data: payload });

    return NextResponse.json({ settings });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo guardar la configuración." }, { status: 400 });
  }
}
