import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import fs from "fs/promises";
import path from "path";

const secret = process.env.JWT_SECRET;

export async function DELETE(req, { params }) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let decoded;
  try {
    decoded = jwt.verify(token, secret);
  } catch (e) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  const photoId = parseInt(params.id);
  if (isNaN(photoId)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  const photo = await prisma.photo.findUnique({
    where: { id: photoId },
  });

  if (!photo || photo.utilisateurId !== decoded.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const fullPath = path.join(process.cwd(), "public", photo.url);
    await fs.unlink(fullPath);
  } catch {
    console.warn("Fichier déjà supprimé ou introuvable.");
  }

  await prisma.photo.delete({
    where: { id: photoId },
  });

  return NextResponse.json({ success: true });
}
