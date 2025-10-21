import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { prisma } from "../../../../lib/prisma";

const secret = process.env.JWT_SECRET;

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  if (!token || !secret) {
    return NextResponse.json({ ok: false, error: "Non authentifié" }, { status: 401 });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, secret);
  } catch {
    return NextResponse.json({ ok: false, error: "Token invalide" }, { status: 403 });
  }

  // ✅ Met à jour la date de dernière activité
  await prisma.utilisateur.update({
    where: { id: decoded.id },
    data: { lastSeenAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
