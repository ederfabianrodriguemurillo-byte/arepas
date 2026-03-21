import { NextResponse } from "next/server";
import { clearSession, getCurrentUser } from "@/lib/auth";
import { canForceLeave, getOpenShiftForUser } from "@/lib/cash-shifts";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  const force = new URL(request.url).searchParams.get("force") === "1";

  if (user) {
    const openShift = await getOpenShiftForUser(user.id);
    if (openShift && !force) {
      return NextResponse.json(
        { error: "Tienes un turno abierto. Debes realizar el cierre de caja antes de salir." },
        { status: 400 },
      );
    }

    if (openShift && force && !canForceLeave(user.rol)) {
      return NextResponse.json(
        { error: "No tienes permisos para dejar un cierre pendiente." },
        { status: 403 },
      );
    }
  }

  await clearSession();
  return NextResponse.json({ ok: true });
}
