import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { saveOptimizedImage } from "@/lib/uploads";

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Debes seleccionar un archivo." }, { status: 400 });
    }

    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      return NextResponse.json({ error: "Formato no permitido. Usa JPG, PNG o WEBP." }, { status: 400 });
    }

    const url = await saveOptimizedImage(file);
    return NextResponse.json({ url });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "No se pudo subir la imagen." }, { status: 400 });
  }
}
