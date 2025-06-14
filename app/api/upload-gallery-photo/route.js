import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

export async function POST(req) {
  const formData = await req.formData();
  const file = formData.get("photo");

  if (!file) {
    return NextResponse.json({ error: "Aucun fichier fourni." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const fileName = `${Date.now()}-${randomUUID()}.jpg`;
  const filePath = path.join(process.cwd(), "public", "uploads", fileName);

  await writeFile(filePath, buffer);

  // Création de la photo en base (galerie publique)
  const url = `/uploads/${fileName}`;
  const photo = await prisma.photo.create({
    data: {
      url,
      estPublique: true,
      utilisateurId: parseInt(formData.get("utilisateurId")) || 0,
    },
  });

  return NextResponse.json(photo, { status: 201 });
}
