import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import jwt from 'jsonwebtoken';

const secret = process.env.JWT_SECRET;

export async function POST(req) {
  const token = req.cookies.get('token')?.value;
  if (!token) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, secret);
  } catch {
    return NextResponse.json({ error: 'Token invalide' }, { status: 403 });
  }

  const { contenu } = await req.json();
  if (!contenu) {
    return NextResponse.json({ error: 'Contenu manquant' }, { status: 400 });
  }

  const message = await prisma.globalMessage.create({
    data: {
      auteurId: decoded.id,
      contenu,
    },
    include: { auteur: { select: { id: true, pseudo: true } } },
  });

  return NextResponse.json(message);
}
