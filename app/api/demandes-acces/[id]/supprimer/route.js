import { prisma } from "../../../../../lib/prisma";
import { NextResponse } from "next/server";

export async function DELETE(_, { params }) {
  const demandeId = parseInt(params.id);
  if (!demandeId) {
    return NextResponse.json({ error: "ID manquant" }, { status: 400 });
  }

  try {
    await prisma.demandeAcces.delete({
      where: { id: demandeId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur suppression accès :", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
