import { NextResponse } from "next/server";
import { headers } from "next/headers";
import jwt from "jsonwebtoken";
import { prisma } from "../../../lib/prisma";

const JWT_SECRET = process.env.JWT_SECRET;

function getUserFromToken() {
  const headerList = headers();
  const cookieHeader = headerList.get("cookie") || "";
  const tokenMatch = cookieHeader.match(/token=([^;]+)/);
  const token = tokenMatch?.[1];

  if (!token || !JWT_SECRET) return null;

  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

export async function GET() {
  const decoded = getUserFromToken();
  if (!decoded) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const userId = decoded.id;

  try {
    // Récupération utilisateur (sélectif)
    const utilisateur = await prisma.utilisateur.findUnique({
      where: { id: userId },
      select: {
        id: true,
        pseudo: true,
        email: true,
        photoUrl: true,
        role: true,
        age: true,
        localisation: true,
      },
    });

    // Conversations récentes (limit 10)
    const conversations = await prisma.conversation.findMany({
      where: {
        participants: {
          some: {
            utilisateurId: userId,
            supprimé: false,
          },
        },
      },
      include: {
        participants: {
          include: {
            utilisateur: {
              select: { id: true, pseudo: true, photoUrl: true },
            },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 10,
    });

    // Notifications non lues (limit 10)
    const notifications = await prisma.notification.findMany({
      where: { utilisateurId: userId, lu: false },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        message: true,
        lien: true,
        createdAt: true,
      },
    });

    // Derniers articles (limit 5)
    const articles = await prisma.article.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        titre: true,
        slug: true,
        createdAt: true,
        images: {
          take: 1,
          select: { url: true },
        },
      },
    });

    // Derniers événements (limit 5)
    const evenements = await prisma.evenement.findMany({
      orderBy: { date: "desc" },
      take: 5,
      select: {
        id: true,
        titre: true,
        imageUrl: true,
        date: true,
        lieu: true,
      },
    });

    return NextResponse.json({
      success: true,
      utilisateur,
      conversations,
      notifications,
      articles,
      evenements,
    });
  } catch (err) {
    console.error("Erreur /api/init :", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
