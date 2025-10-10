// app/api/annonces/[id]/route.js
import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { getUserFromToken } from "../../../../lib/auth";

function bad(status, message) {
  return NextResponse.json({ success: false, message }, { status });
}
export async function PUT(req, { params }) {
  try {
    const user = await getUserFromToken();
    if (!user || user.role !== "ADMIN")
      return NextResponse.json({ success:false, message:"Accès refusé" }, { status:403 });

    const body = await req.json();
    const { id } = params;

    const updated = await prisma.annonce.update({
      where: { id },
      data: {
        ...(body.titre != null ? { titre: body.titre.trim() } : {}),
        ...(body.message != null ? { message: body.message.trim() } : {}),
        ...(body.actif != null ? { actif: !!body.actif } : {}),
        ...(body.expireAt !== undefined ? { expireAt: body.expireAt ? new Date(body.expireAt) : null } : {}),

        ...(body.durationMs !== undefined ? { durationMs: body.durationMs ?? null } : {}),
        ...(body.textColor !== undefined ? { textColor: body.textColor || null } : {}),
        ...(body.bgColor !== undefined ? { bgColor: body.bgColor || null } : {}),
        ...(body.overlayColor !== undefined ? { overlayColor: body.overlayColor || null } : {}),
        ...(body.fontSizePx !== undefined ? { fontSizePx: body.fontSizePx ?? null } : {}),
        ...(body.borderRadiusPx !== undefined ? { borderRadiusPx: body.borderRadiusPx ?? null } : {}),
        ...(body.maxWidthPx !== undefined ? { maxWidthPx: body.maxWidthPx ?? null } : {}),
      },
    });

    return NextResponse.json({ success:true, data: updated });
  } catch (err) {
    console.error("💥 PUT /api/annonces/[id]", err);
    return NextResponse.json({ success:false, message: err.message || "Erreur interne" }, { status:500 });
  }
}
