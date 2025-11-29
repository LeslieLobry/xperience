import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma"; // ⬅️ IMPORTANT : on importe le singleton

const secret = process.env.JWT_SECRET;

// Pas besoin d'async, on lit juste les cookies + JWT
function getUserIdFromToken() {
  const token = cookies().get("token")?.value;
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, secret);
    const id = decoded?.id;

    if (!id) return null;

    // On renvoie toujours un nombre
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

  const avis = await prisma.avis.findUnique({ where: { id: avisId } });

  if (!avis || avis.auteurId !== userId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  await prisma.avis.delete({ where: { id: avisId } });

  return NextResponse.json({ success: true });
}
