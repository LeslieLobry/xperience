// app/api/admin/partenaires/route.js
import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { getUserFromToken } from "../../../../lib/auth";
import { v4 as uuidv4 } from "uuid";

export async function GET() {
  const user = await getUserFromToken();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const partenaires = await prisma.partenaire.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(partenaires);
}

export async function POST(req) {
  const user = await getUserFromToken();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const body = await req.json();
  const { nom, type, lien } = body;

  if (!nom || !type || !lien) {
    return NextResponse.json({ error: "Champs requis" }, { status: 400 });
  }

  const nouveau = await prisma.partenaire.create({
    data: {
      id: uuidv4(),         // ← ajoute manuellement l'ID UUID
      nom,
      type,
      lien,
    },
  });

  return NextResponse.json(nouveau);
}
export async function DELETE(req) {
  const user = await getUserFromToken();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const { id } = await req.json();
  if (!id) {
    return NextResponse.json({ error: "ID manquant" }, { status: 400 });
  }

  await prisma.partenaire.delete({ where: { id } });
  return NextResponse.json({ success: true });
}

export async function PUT(req) {
  const user = await getUserFromToken();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const { id, nom, type, lien } = await req.json();
  if (!id || !nom || !type || !lien) {
    return NextResponse.json({ error: "Champs requis" }, { status: 400 });
  }

  const updated = await prisma.partenaire.update({
    where: { id },
    data: { nom, type, lien },
  });

  return NextResponse.json(updated);
}
