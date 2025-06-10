import { prisma } from "../../../lib/prisma";
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

export async function POST(req) {
  const user = await getUserFromToken();
  if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const body = await req.json();
  const { galeriePriveeId } = body;
  if (!galeriePriveeId) return NextResponse.json({ error: "galeriePriveeId manquant" }, { status: 400 });

  try {
    // Vérifie s'il n'a pas déjà fait une demande
    const existingDemande = await prisma.demandeAcces.findUnique({
      where: {
        galeriePriveeId_utilisateurId: {
          galeriePriveeId: galeriePriveeId,
          demandeurId: user.id,
        }
      }
    });
    if (existingDemande) {
      return NextResponse.json({ error: "Demande déjà faite" }, { status: 400 });
    }

    // Crée la demande d'accès en statut EN_ATTENTE
    const demande = await prisma.demandeAcces.create({
      data: {
        galeriePriveeId,
        demandeurId: user.id,
      }
    });

    return NextResponse.json(demande);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
