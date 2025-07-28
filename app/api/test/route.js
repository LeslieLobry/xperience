// app/api/test/route.js
import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

export async function GET() {
  try {
    const updated = await prisma.verificationIdentite.update({
      where: { id: 1 }, // remplace par un ID réel existant
      data: { statut: "ACCEPTEE" }, // ✅ bien "statut", PAS "new"
    });

    return NextResponse.json({ success: true, updated });
  } catch (err) {
    console.error("Erreur /api/test :", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
