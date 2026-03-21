import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

export async function saveOptimizedImage(file: File) {
  const bytes = Buffer.from(await file.arrayBuffer());
  const filename = `${Date.now()}-${file.name.replace(/\s+/g, "-").toLowerCase()}.webp`;
  const relativeDir = path.join("public", "uploads");
  const fullDir = path.join(process.cwd(), relativeDir);
  await mkdir(fullDir, { recursive: true });

  const optimized = await sharp(bytes)
    .rotate()
    .resize({ width: 640, height: 640, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 78 })
    .toBuffer();

  await writeFile(path.join(fullDir, filename), optimized);
  return `/uploads/${filename}`;
}
