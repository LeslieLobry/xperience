import { cookies } from "next/headers";
import { prisma } from '../../../../../lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(request, { params }) {
  const { code } = await request.json();
  const galerie = await prisma.galeriePrivee.findUnique({ where: { id: Number(params.id) } });
  if (!galerie) return Response.json({ error: 'Introuvable' }, { status: 404 });

  const ok = await bcrypt.compare(code, galerie.codeAcces);
  if (!ok) return Response.json({ error: 'Code invalide' }, { status: 403 });

  // Met un cookie d'accès valable 24h
  cookies().set(`acces_galerie_${params.id}`, "ok", {
    httpOnly: true,
    maxAge: 60 * 60 * 24, // 24h
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return Response.json({ success: true }, { status: 200 });
}
