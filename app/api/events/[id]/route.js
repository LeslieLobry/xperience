import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import path from "path";
import fs from "fs/promises";
import sharp from "sharp";

const JWT_SECRET = process.env.JWT_SECRET;

async function getUserFromCookie() {
  const cookieStore = await cookies();
  const token = (await cookieStore)?.get("token")?.value;
  if (!token || !JWT_SECRET) return null;

  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

export async function PUT(req, { params }) {
  const user = await getUserFromCookie();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const formData = await req.formData();
  const id = parseInt(params.id);
  const imageFile = formData.get("image");

  let imageUrl = null;

  // 📦 On récupère l'événement pour supprimer l'ancienne image si besoin
  const existing = await prisma.evenement.findUnique({
    where: { id },
    select: { imageUrl: true },
  });

  // 🖼️ Si nouvelle image, remplacer
  if (imageFile && typeof imageFile !== "string") {
    const bytes = await imageFile.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filename = `event_${Date.now()}.webp`;
    const filepath = path.join(process.cwd(), "public/uploads", filename);

    await fs.mkdir(path.dirname(filepath), { recursive: true });
    await sharp(buffer).resize(800).webp({ quality: 80 }).toFile(filepath);

    imageUrl = `/uploads/${filename}`;

    // ❌ supprimer l'ancienne si elle existe
    if (existing.imageUrl) {
      const oldPath = path.join(process.cwd(), "public", existing.imageUrl);
      try {
        await fs.unlink(oldPath);
      } catch (e) {
        console.warn("Ancienne image introuvable ou déjà supprimée");
      }
    }
  }

  const updated = await prisma.evenement.update({
    where: { id },
    data: {
      titre: formData.get("titre"),
      description: formData.get("description"),
      date: new Date(formData.get("date")),
      lieu: formData.get("lieu"),
      type: formData.get("type"),
      acces: formData.get("acces"),
      ...(imageUrl && { imageUrl }),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_, { params }) {
  const user = await getUserFromCookie();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const id = parseInt(params.id);

  const existing = await prisma.evenement.findUnique({
    where: { id },
    select: { imageUrl: true },
  });

  // ❌ supprimer l'image si elle existe
  if (existing?.imageUrl) {
    const imagePath = path.join(process.cwd(), "public", existing.imageUrl);
    try {
      await fs.unlink(imagePath);
    } catch (e) {
      console.warn("Image introuvable lors de la suppression.");
    }
  }

  await prisma.evenement.delete({
    where: { id },
  });

  return NextResponse.json({ success: true });
}
