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
  const user = await getUserFromToken();
  if (!user || user.role !== "ADMIN") return bad(403, "Accès refusé");

  const { titre, message, actif = true, expireAt } = await req.json();
  if (!titre?.trim() || !message?.trim()) return bad(400, "Titre et message requis");

  const created = await prisma.annonce.create({
    data: {
      titre: titre.trim(),
      message: message.trim(),
      actif: !!actif,
      expireAt: expireAt ? new Date(expireAt) : null,
    },
  });
  return NextResponse.json({ success: true, data: created });
}
