// app/api/galerie-privee/demandes/[id]/route.js

import { prisma } from "../../../../../lib/prisma";
import { getUserFromToken } from "../../../../../lib/auth";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function PATCH(req, { params }) {
  const cookieStore = cookies();
  const user = await getUserFromToken(cookieStore);
  const { statut } = await req.json();
  const demandeId = parseInt(params.id);

  if (!user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  if (!["ACCEPTEE", "REFUSEE"].includes(statut)) {
    return NextResponse.json({ error: "Statut invalide" }, { status: 400 });
  }

  const demande = await prisma.demandeAcces.findUnique({
    where: { id: demandeId },
    include: { galeriePrivee: true },
  });

  if (!demande || demande.galeriePrivee.utilisateurId !== user.id) {
    return NextResponse.json({ error: "Demande invalide" }, { status: 403 });
  }

  await prisma.demandeAcces.update({
    where: { id: demandeId },
    data: { statut },
  });

  return NextResponse.json({ success: true });
}
