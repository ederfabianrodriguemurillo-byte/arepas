import { NextResponse } from "next/server";
import { requirePrincipal, hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { userSchema } from "@/lib/schemas";

export async function POST(request: Request) {
  try {
    await requirePrincipal();
    const payload = userSchema.parse(await request.json());
    const password = payload.password?.trim() || "Temporal123!";
    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        nombre: payload.nombre,
        email: payload.email,
        rol: payload.rol,
        activo: payload.activo,
        passwordHash,
      },
    });
    return NextResponse.json({ user });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo crear el usuario." }, { status: 400 });
  }
}
