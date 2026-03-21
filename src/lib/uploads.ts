import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { put } from "@vercel/blob";
import sharp from "sharp";

export async function saveOptimizedImage(file: File) {
  const bytes = Buffer.from(await file.arrayBuffer());
  const filename = `${Date.now()}-${file.name.replace(/\s+/g, "-").toLowerCase()}.webp`;

  const optimized = await sharp(bytes)
    .rotate()
    .resize({ width: 640, height: 640, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 78 })
    .toBuffer();

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(`products/${filename}`, optimized, {
      access: "public",
      addRandomSuffix: false,
      contentType: "image/webp",
    });
    return blob.url;
  }

  if (process.env.VERCEL || process.env.NODE_ENV === "production") {
    throw new Error("Falta configurar BLOB_READ_WRITE_TOKEN para subir imágenes en producción.");
  }

  const relativeDir = path.join("public", "uploads");
  const fullDir = path.join(process.cwd(), relativeDir);
  await mkdir(fullDir, { recursive: true });
  await writeFile(path.join(fullDir, filename), optimized);
  return `/uploads/${filename}`;
}
