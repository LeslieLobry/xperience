import { PrismaClient } from "@prisma/client";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();
const secret = process.env.JWT_SECRET;

async function getUserIdFromToken() {
  const token = cookies().get("token")?.value;
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, secret);
    return decoded?.id || null;
  } catch {
    return null;
  }
}

export async function PATCH(req, { params }) {
  const userId = await getUserIdFromToken();
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { id } = params;
  const { commentaire } = await req.json();

  const avis = await prisma.avis.findUnique({ where: { id: parseInt(id) } });
  if (!avis || avis.auteurId !== userId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const updated = await prisma.avis.update({
    where: { id: parseInt(id) },
    data: { commentaire },
  });

  return NextResponse.json(updated);
}

export async function DELETE(req, { params }) {
  const userId = await getUserIdFromToken();
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { id } = params;

  const avis = await prisma.avis.findUnique({ where: { id: parseInt(id) } });
  if (!avis || avis.auteurId !== userId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  await prisma.avis.delete({ where: { id: parseInt(id) } });
  return NextResponse.json({ success: true });
}
