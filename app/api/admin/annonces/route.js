// app/api/admin/annonces/route.js
import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { getUserFromToken } from "../../../../lib/auth";

function bad(status, message) {
  return NextResponse.json({ success: false, message }, { status });
}

// 🔢 helper pour caster proprement un nombre ou null
const num = (v) =>
  v === null || v === undefined || v === "" ? null : Number.isFinite(+v) ? +v : null;

export async function GET() {
  const user = await getUserFromToken();
  if (!user || user.role !== "ADMIN") return bad(403, "Accès refusé");

  const data = await prisma.annonce.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      titre: true,
      message: true,
      actif: true,
      expireAt: true,
      durationMs: true,
      textColor: true,
      bgColor: true,
      overlayColor: true,
      fontSize: true,           // ✅ renommé
      borderRadiusPx: true,
      maxWidthPx: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ success: true, data });
}

export async function POST(req) {
  try {
    const user = await getUserFromToken();
    if (!user || user.role !== "ADMIN") return bad(403, "Accès refusé");

    let body;
    try {
      body = await req.json();
    } catch {
      return bad(400, "Corps JSON invalide");
    }

    const titre = String(body?.titre || "").trim();
    const message = String(body?.message || "").trim();
    if (!titre || !message) return bad(400, "Titre et message requis");

    const created = await prisma.annonce.create({
      data: {
        titre,
        message,
        actif: !!(body.actif ?? true),
        expireAt: body.expireAt ? new Date(body.expireAt) : null,

        // 🎛️ Options de rendu
        durationMs: num(body.durationMs),
        textColor: body.textColor || null,
        bgColor: body.bgColor || null,
        overlayColor: body.overlayColor || null,
        fontSize: num(body.fontSize),           // ✅ renommé
        borderRadiusPx: num(body.borderRadiusPx),
        maxWidthPx: num(body.maxWidthPx),
      },
    });

    return NextResponse.json({ success: true, data: created });
  } catch (err) {
    console.error("❌ ERREUR POST /api/admin/annonces :", err);
    return NextResponse.json(
      { success: false, message: err?.message || "Erreur interne" },
      { status: 500 }
    );
  }
}
