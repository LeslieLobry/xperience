import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { getUserFromToken } from "../../../../../lib/auth";

export const runtime = "nodejs";

export async function DELETE(req, { params }) {
  try {
    const me = await getUserFromToken(req);
    if (!me?.id) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

    const demandeId = Number(params.id);
    if (!Number.isFinite(demandeId)) {
      return NextResponse.json({ error: "BAD_ID" }, { status: 400 });
    }

    const demande = await prisma.demandeAcces.findUnique({
      where: { id: demandeId },
      select: { id: true, demandeurId: true, statut: true },
    });

    if (!demande) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    if (Number(demande.demandeurId) !== Number(me.id)) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    // EN_ATTENTE => annuler
    // ACCEPTEE  => quitter
    // REFUSEE   => nettoyer
    await prisma.demandeAcces.delete({ where: { id: demandeId } });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (e) {
    console.error("delete mes-demandes error", e);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
