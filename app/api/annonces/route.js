// app/api/annonces/route.js
import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { getUserFromToken } from "../../../lib/auth";

function bad(status, message) {
  return NextResponse.json({ success: false, message }, { status });
}

function toNullableNumber(v) {
  if (v === "" || v === undefined || v === null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function GET() {
  try {
    const now = new Date();
    const annonces = await prisma.annonce.findMany({
      where: {
        actif: true,
        OR: [{ expireAt: null }, { expireAt: { gt: now } }],
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ success: true, data: annonces });
  } catch (err) {
    console.error("💥 GET /api/annonces", err);
    return bad(500, "Erreur interne");
  }
}

export async function POST(req) {
  try {
    const user = await getUserFromToken();
    if (!user || user.role !== "ADMIN") return bad(403, "Accès refusé");

    const body = await req.json();

    const {
      titre,
      message,
      actif = true,
      expireAt,
      durationMs,
      textColor,
      bgColor,
      overlayColor,
      fontSizePx,
      borderRadiusPx,
      maxWidthPx,
    } = body || {};

    if (!titre?.trim() || !message?.trim()) return bad(400, "Titre et message requis");

    const created = await prisma.annonce.create({
      data: {
        titre: titre.trim(),
        message: message.trim(),
        actif: !!actif,
        expireAt: expireAt ? new Date(expireAt) : null,

        durationMs: toNullableNumber(durationMs),
        textColor: textColor || null,
        bgColor: bgColor || null,
        overlayColor: overlayColor || null,

        // ✅ accepte "36" ou 36
        fontSizePx: toNullableNumber(fontSizePx),
        borderRadiusPx: toNullableNumber(borderRadiusPx),
        maxWidthPx: toNullableNumber(maxWidthPx),
      },
    });

    return NextResponse.json({ success: true, data: created });
  } catch (err) {
    console.error("💥 POST /api/annonces", err);
    return bad(500, err?.message || "Erreur interne");
  }
}