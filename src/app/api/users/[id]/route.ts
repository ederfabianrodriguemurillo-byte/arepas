import { NextResponse } from "next/server";
import { requirePrincipal, hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { userSchema } from "@/lib/schemas";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePrincipal();
    const payload = userSchema.parse(await request.json());
    const { id } = await params;
    const existing = await prisma.user.findUnique({ where: { id } });

    if (!existing) {
      return NextResponse.json({ error: "Usuario no encontrado." }, { status: 404 });
    }

    if (existing.rol === "PRINCIPAL_ADMIN" && payload.rol !== "PRINCIPAL_ADMIN") {
      return NextResponse.json({ error: "No se puede degradar al administrador principal." }, { status: 400 });
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        nombre: payload.nombre,
        email: payload.email,
        rol: payload.rol,
        activo: payload.activo,
        ...(payload.password ? { passwordHash: await hashPassword(payload.password) } : {}),
      },
    });
    return NextResponse.json({ user });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo actualizar el usuario." }, { status: 400 });
  }
}
