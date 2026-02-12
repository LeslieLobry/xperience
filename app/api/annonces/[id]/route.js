import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { getUserFromToken } from "../../../../lib/auth";

function bad(status, message) {
  return NextResponse.json({ success: false, message }, { status });
}

export async function DELETE(_req, { params }) {
  try {
    const user = await getUserFromToken();
    if (!user || user.role !== "ADMIN") return bad(403, "Accès refusé");

    const { id } = params;
    await prisma.annonce.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (err) {
    // not found
    if (err?.code === "P2025") {
      return NextResponse.json({ success: false, message: "Annonce introuvable" }, { status: 404 });
    }
    console.error("💥 DELETE /api/annonces/[id]", err);
    return NextResponse.json({ success: false, message: "Erreur interne" }, { status: 500 });
  }
}

// (facultatif mais utile pour debug : vérifier PUT aussi)
export async function PUT(req, { params }) {
  try {
    const user = await getUserFromToken();
    if (!user || user.role !== "ADMIN") return bad(403, "Accès refusé");

    const body = await req.json();
    const { id } = params;

    const data = {
      ...(body.titre != null ? { titre: body.titre.trim() } : {}),
      ...(body.message != null ? { message: body.message.trim() } : {}),
      ...(body.actif != null ? { actif: !!body.actif } : {}),
      ...(body.expireAt !== undefined ? { expireAt: body.expireAt ? new Date(body.expireAt) : null } : {}),

      // 🎨 champs d’options supplémentaires
      ...(body.durationMs !== undefined ? { durationMs: body.durationMs ?? null } : {}),
      ...(body.textColor !== undefined ? { textColor: body.textColor || null } : {}),
      ...(body.bgColor !== undefined ? { bgColor: body.bgColor || null } : {}),
      ...(body.overlayColor !== undefined ? { overlayColor: body.overlayColor || null } : {}),
      ...(body.fontSizePx !== undefined || body.fontSize !== undefined
  ? { fontSizePx: (body.fontSizePx ?? body.fontSize) === "" || (body.fontSizePx ?? body.fontSize) == null ? null : Number(body.fontSizePx ?? body.fontSize) }
  : {}),

      ...(body.borderRadiusPx !== undefined ? { borderRadiusPx: body.borderRadiusPx ?? null } : {}),
      ...(body.maxWidthPx !== undefined ? { maxWidthPx: body.maxWidthPx ?? null } : {}),
    };

    const updated = await prisma.annonce.update({
      where: { id },
      data,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    console.error("💥 PUT /api/annonces/[id]", err);
    return NextResponse.json({ success: false, message: "Erreur interne" }, { status: 500 });
  }
}
