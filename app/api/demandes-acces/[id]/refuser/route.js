// /api/demandes-acces/[id]/refuser/route.js
import { prisma } from "../../../../../prisma";
import { NextResponse } from "next/server";

export async function PATCH(req, { params }) {
  const demandeId = parseInt(params.id);

  const updated = await prisma.demandeAcces.update({
    where: { id: demandeId },
    data: { statut: "REFUSEE" },
  });

  return NextResponse.json(updated);
}
