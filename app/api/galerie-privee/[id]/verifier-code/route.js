import { cookies } from "next/headers";
import { prisma } from '../../../../../lib/prisma';
import bcrypt from 'bcryptjs';
import { NextResponse } from "next/server";

export async function POST(request, context) {
  const galerieId = Number(context.params.id);
  const { code } = await request.json();

  if (!code || isNaN(galerieId)) {
    return NextResponse.json({ error: 'Données invalides' }, { status: 400 });
  }

  const galerie = await prisma.galeriePrivee.findUnique({ where: { id: galerieId } });
  if (!galerie) {
    return NextResponse.json({ error: 'Galerie introuvable' }, { status: 404 });
  }

  const ok = await bcrypt.compare(code, galerie.codeAcces);
  if (!ok) {
    return NextResponse.json({ error: 'Code invalide' }, { status: 403 });
  }

  // ✅ Met un cookie d'accès valable 24h
  cookies().set(`acces_galerie_${galerieId}`, "ok", {
    httpOnly: true,
    maxAge: 60 * 60 * 24, // 24h
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return NextResponse.json({ success: true });
}
