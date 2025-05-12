import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";
import { NextResponse } from "next/server";

export async function POST(req) {
  const formData = await req.formData();
  const file = formData.get("image");

  if (!file || typeof file.name !== "string") {
    return NextResponse.json({ success: false, message: "Fichier invalide." }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const fileName = `${randomUUID()}-${file.name}`;
  const uploadDir = join(process.cwd(), "public", "uploads", "articles");

  try {
    await mkdir(uploadDir, { recursive: true }); // au cas où le dossier n’existe pas encore
    const filePath = join(uploadDir, fileName);
    await writeFile(filePath, buffer);

    const imageUrl = `/uploads/articles/${fileName}`;
    return NextResponse.json({ success: true, imageUrl });
  } catch (error) {
    console.error("Erreur upload:", error);
    return NextResponse.json({ success: false, message: "Erreur lors de l’upload." }, { status: 500 });
  }
}
