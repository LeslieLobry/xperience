import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

const JWT_SECRET = process.env.JWT_SECRET;

async function getUserFromToken() {
  const cookieStore = cookies();
  const allCookies = await cookieStore;
  const token = allCookies.get("token")?.value;
  if (!token || !JWT_SECRET) return null;
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    const user = await getUserFromToken();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

const unreadMessages = await prisma.message.findMany({
  where: {
    lu: false,
    auteurId: { not: user.id },
    conversation: {
      participants: {
        some: {
          utilisateurId: user.id,
          supprimé: false,    // AJOUT ICI !!
        },
      },
    },
  },
  orderBy: { createdAt: "desc" },
  take: 20,
  include: {
    auteur: { select: { id: true, pseudo: true } },
    conversation: true,
  },
});


    return NextResponse.json(unreadMessages);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
