// app/api/annonces/route.js
import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { getUserFromToken } from "../../../lib/auth"; // utile pour POST

function bad(status, message) {
  return NextResponse.json({ success: false, message }, { status });
}

export async function GET() {
  const now = new Date();
  const annonces = await prisma.annonce.findMany({
    where: { actif: true, OR: [{ expireAt: null }, { expireAt: { gt: now } }] },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ success: true, data: annonces });
}

export async function POST(req) {
  try {
    const user = await getUserFromToken();
    if (!user || user.role !== "ADMIN")
      return NextResponse.json({ success:false, message:"Accès refusé" }, { status:403 });

    const body = await req.json();

    const {
      titre, message, actif = true, expireAt,
      durationMs, textColor, bgColor, overlayColor,
      fontSizePx, borderRadiusPx, maxWidthPx
    } = body || {};

    if (!titre?.trim() || !message?.trim())
      return NextResponse.json({ success:false, message:"Titre et message requis" }, { status:400 });

    const created = await prisma.annonce.create({
      data: {
        titre: titre.trim(),
        message: message.trim(),
        actif: !!actif,
        expireAt: expireAt ? new Date(expireAt) : null,
        // 🎛️ options (null si non fournie)
        durationMs: typeof durationMs === "number" ? durationMs : null,
        textColor: textColor || null,
        bgColor: bgColor || null,
        overlayColor: overlayColor || null,
        fontSizePx: Number.isInteger(fontSizePx) ? fontSizePx : null,
        borderRadiusPx: Number.isInteger(borderRadiusPx) ? borderRadiusPx : null,
        maxWidthPx: Number.isInteger(maxWidthPx) ? maxWidthPx : null,
      },
    });

    return NextResponse.json({ success:true, data: created });
  } catch (err) {
    console.error("💥 POST /api/annonces", err);
    return NextResponse.json({ success:false, message: err.message || "Erreur interne" }, { status:500 });
  }
}
