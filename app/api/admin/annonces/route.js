// app/api/admin/annonces/route.js
import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { getUserFromToken } from "../../../../lib/auth";

function bad(status, message) {
  return NextResponse.json({ success: false, message }, { status });
}

export async function GET() {
  const user = await getUserFromToken();
  if (!user || user.role !== "ADMIN") return bad(403, "Accès refusé");

  const annonces = await prisma.annonce.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ success: true, data: annonces });
}
export async function POST(req) {
  try {
    const user = await getUserFromToken();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ success: false, message: "Accès refusé" }, { status: 403 });
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ success: false, message: "Corps JSON invalide" }, { status: 400 });
    }

    const { titre, message, actif = true, expireAt } = body;
    if (!titre?.trim() || !message?.trim()) {
      return NextResponse.json({ success: false, message: "Titre et message requis" }, { status: 400 });
    }

    const created = await prisma.annonce.create({
      data: {
        titre: titre.trim(),
        message: message.trim(),
        actif: !!actif,
        expireAt: expireAt ? new Date(expireAt) : null,
      },
    });

    return NextResponse.json({ success: true, data: created });
  } catch (err) {
    console.error("❌ ERREUR POST /api/annonces :", err);
    return NextResponse.json({ success: false, message: err.message || "Erreur interne" }, { status: 500 });
  }
}
