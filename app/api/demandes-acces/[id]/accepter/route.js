// /api/demandes-acces/[id]/accepter/route.js
import { prisma } from "../../../../../lib/prisma";
import { NextResponse } from "next/server";

export async function PATCH(req, { params }) {
  const demandeId = parseInt(params.id);

  const updated = await prisma.demandeAcces.update({
    where: { id: demandeId },
    data: { statut: "ACCEPTEE" },
  });

  return NextResponse.json(updated);
}
