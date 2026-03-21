import { NextResponse } from "next/server";
import { createSession, saveSession, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/schemas";

export async function POST(request: Request) {
  try {
    const payload = loginSchema.parse(await request.json());
    const user = await prisma.user.findUnique({ where: { email: payload.email } });

    if (!user || !user.activo) {
      return NextResponse.json({ error: "Credenciales inválidas." }, { status: 401 });
    }

    const valid = await verifyPassword(payload.password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Credenciales inválidas." }, { status: 401 });
    }

    const token = await createSession({ userId: user.id, role: user.rol, email: user.email });
    await saveSession(token);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo iniciar sesión." }, { status: 400 });
  }
}
