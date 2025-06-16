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
    include: {
      auteur: {
        select: { id: true, pseudo: true },
      },
    },
  });

  return NextResponse.json({
    ...message,
    createdAtFormatted: new Date(message.createdAt).toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  });
}

export async function GET() {
  try {
    const messages = await prisma.globalMessage.findMany({
      orderBy: { createdAt: "asc" },
      include: {
        auteur: {
          select: { id: true, pseudo: true },
        },
      },
    });

    return NextResponse.json({ messages }); // ✅ Encapsulé dans un objet
  } catch (error) {
    console.error("Erreur récupération messages globaux :", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
