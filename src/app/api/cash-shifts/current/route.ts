import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getOpenShiftForUser, summarizeShift } from "@/lib/cash-shifts";

export async function GET() {
  const user = await requireUser();
  const shift = await getOpenShiftForUser(user.id);
  return NextResponse.json({
    shift,
    summary: shift ? summarizeShift(shift) : null,
  });
}
