import { prisma } from "../../../../../lib/prisma";
import { NextResponse } from "next/server";

export async function GET(_, { params }) {
  const utilisateurId = parseInt(params.id, 10);

  if (isNaN(utilisateurId)) {
    return NextResponse.json({ error: "ID invalide" }, { status: 400 });
  }

  const galerie = await prisma.galeriePrivee.findFirst({
    where: { utilisateurId },
  });

  return NextResponse.json(galerie || {});
}
