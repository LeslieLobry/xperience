// app/api/demandes-acces/[id]/route.js

import { prisma } from "../../../../lib/prisma";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

const JWT_SECRET = process.env.JWT_SECRET;

async function getUserFromToken() {
  const cookieStore = cookies();
  const token = cookieStore.get("token")?.value;
  if (!token || !JWT_SECRET) return null;
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

export async function PATCH(req, { params }) {
  const user = await getUserFromToken();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const demandeId = parseInt(params.id, 10);
  if (!demandeId) return NextResponse.json({ error: "ID de demande invalide" }, { status: 400 });

  const body = await req.json();
  const { statut } = body;

  if (!['ACCEPTEE', 'REFUSEE'].includes(statut)) {
    return NextResponse.json({ error: "Statut invalide" }, { status: 400 });
  }

  try {
    // Vérifier que la demande existe et appartient bien à une galerie du propriétaire
    const demande = await prisma.demandeAcces.findUnique({
      where: { id: demandeId },
      include: { galeriePrivee: true },
    });

    if (!demande) return NextResponse.json({ error: "Demande introuvable" }, { status: 404 });
    if (demande.galeriePrivee.utilisateurId !== user.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    // Mettre à jour le statut de la demande
    const updated = await prisma.demandeAcces.update({
      where: { id: demandeId },
      data: { statut },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
