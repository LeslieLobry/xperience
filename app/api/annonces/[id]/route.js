// app/api/annonces/[id]/route.js
import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { getUserFromToken } from "../../../../lib/auth";

function bad(status, message) {
  return NextResponse.json({ success: false, message }, { status });
}

export async function PUT(req, { params }) {
  const user = await getUserFromToken();
  if (!user || user.role !== "ADMIN") return bad(403, "Accès refusé");

  const { id } = params;
  const { titre, message, actif, expireAt } = await req.json();

  const updated = await prisma.annonce.update({
    where: { id },
    data: {
      ...(titre != null ? { titre: titre.trim() } : {}),
      ...(message != null ? { message: message.trim() } : {}),
      ...(actif != null ? { actif: !!actif } : {}),
      ...(expireAt !== undefined ? { expireAt: expireAt ? new Date(expireAt) : null } : {}),
    },
  });

  return NextResponse.json({ success: true, data: updated });
}

export async function DELETE(req, { params }) {
  const user = await getUserFromToken();
  if (!user || user.role !== "ADMIN") return bad(403, "Accès refusé");

  const { id } = params;
  await prisma.annonce.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
