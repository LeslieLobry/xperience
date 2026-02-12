import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

const secret = process.env.JWT_SECRET;

function getUserIdFromToken() {
  const token = cookies().get("token")?.value;
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, secret);
    const id = decoded?.id;
    if (!id) return null;
    return typeof id === "number" ? id : parseInt(id, 10);
  } catch {
    return null;
  }
}

export async function PATCH(req, { params }) {
  const userId = getUserIdFromToken();
  if (!userId) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { id } = params;
  const { commentaire } = await req.json();
  const avisId = parseInt(id, 10);

  const avis = await prisma.avis.findUnique({ where: { id: avisId } });

  // ✅ Seul l'auteur peut modifier
  if (!avis || avis.auteurId !== userId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const updated = await prisma.avis.update({
    where: { id: avisId },
    data: { commentaire },
  });

  return NextResponse.json(updated);
}

export async function DELETE(req, { params }) {
  const userId = getUserIdFromToken();
  if (!userId) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { id } = params;
  const avisId = parseInt(id, 10);

  // ✅ On récupère juste ce qu'il faut
  const avis = await prisma.avis.findUnique({
    where: { id: avisId },
    select: {
      id: true,
      auteurId: true,
      cibleId: true, // ⬅️ IMPORTANT : doit exister dans ton modèle Avis
    },
  });

  if (!avis) {
    return NextResponse.json({ error: "Avis introuvable" }, { status: 404 });
  }

  // ✅ Autorisé si :
  // - l'auteur supprime son avis
  // - OU la cible (propriétaire du profil) supprime un avis reçu sur son profil
  const canDelete = avis.auteurId === userId || avis.cibleId === userId;

  if (!canDelete) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  await prisma.avis.delete({ where: { id: avisId } });

  return NextResponse.json({ success: true });
}
