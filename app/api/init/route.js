import { NextResponse } from "next/server";
import { headers } from "next/headers";
import jwt from "jsonwebtoken";
import { prisma } from "../../../lib/prisma";
import { type } from "os";

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
    const [
      utilisateur,
      conversations,
      notifications,
      articles,
      evenementsRaw
    ] = await Promise.all([
      prisma.utilisateur.findUnique({
        where: { id: userId },
        select: {
          id: true,
          pseudo: true,
          type: true,
          email: true,
          photoUrl: true,
          role: true,
          age: true,
          localisation: true,
          verificationDeadline: true,
          verificationIdentite: true,
        },
      }),

      prisma.conversation.findMany({
        where: {
          participants: {
            some: { utilisateurId: userId, supprimé: false },
          },
        },
        include: {
          participants: {
            where: { supprimé: false },
            take: 2,
            select: {
              utilisateurId: true,
              utilisateur: {
                select: { id: true, pseudo: true, photoUrl: true },
              },
            },
          },
        },
        orderBy: { updatedAt: "desc" },
        take: 10,
      }),

      prisma.notification.findMany({
        where: { utilisateurId: userId, lu: false },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { id: true, message: true, lien: true, createdAt: true },
      }),

      prisma.article.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        include: {
          images: {
            take: 1,
            select: { url: true },
          },
        },
      }),

      prisma.evenement.findMany({
        select: {
          id: true,
          titre: true,
          imageUrl: true,
          dates: true,
          lieu: true,
        },
        take: 20, // limite brute, vrai filtre ci-dessous
      }),
    ]);

    // 👉 Filtrer et trier les événements à venir (dates >= aujourd'hui)
    const now = new Date();
    const evenements = (evenementsRaw || [])
      .filter(evt =>
        Array.isArray(evt.dates) &&
        evt.dates.some(d => new Date(d) >= now)
      )
      .sort((a, b) => {
        const nextA = (a.dates || []).find(d => new Date(d) >= now) || a.dates[0];
        const nextB = (b.dates || []).find(d => new Date(d) >= now) || b.dates[0];
        return new Date(nextA) - new Date(nextB);
      })
      .slice(0, 5);

    return NextResponse.json({
      success: true,
      utilisateur,
      conversations,
      notifications,
      articles,
      evenements,
    });
  } catch (err) {
    console.error("❌ Erreur /api/init :", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
