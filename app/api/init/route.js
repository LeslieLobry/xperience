import { NextResponse } from "next/server";
import { headers } from "next/headers";
import jwt from "jsonwebtoken";
import { prisma } from "../../../lib/prisma";

const JWT_SECRET = process.env.JWT_SECRET;

// getUserFromToken DOIT être async en Next.js app dir API
async function getUserFromToken() {
  const headerList = await headers();
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
  const decoded = await getUserFromToken();
  if (!decoded) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const userId = decoded.id;

  try {
    // -- PROMISE ALL OPTI --
    const [
      utilisateur,
      conversations,
      notifications,
      articles,
      evenementsRaw,
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
          verificationIdentiteStatut: true,
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
        take: 20,
      }),
    ]);

    // Sécurité : utilisateur n'existe plus
    if (!utilisateur) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 401 });
    }

    // Trier/filtrer les évènements à venir
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
