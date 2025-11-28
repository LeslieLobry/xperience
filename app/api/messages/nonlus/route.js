import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import jwt from "jsonwebtoken";
import { cookies, headers } from "next/headers";

const JWT_SECRET = process.env.JWT_SECRET;

// Récupère le token dans Authorization: Bearer xxx
function getTokenFromAuthHeader(h) {
  const auth = h.get("authorization") || h.get("Authorization");
  if (!auth) return null;
  if (!auth.toLowerCase().startsWith("bearer ")) return null;
  return auth.slice(7).trim() || null;
}

async function getUserFromToken() {
  const h = headers();

  // 1) App mobile : header Authorization
  let token = getTokenFromAuthHeader(h);

  // 2) Site web : cookie "token"
  if (!token) {
    const cookieStore = cookies();
    token = cookieStore.get("token")?.value || null;
  }

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
    if (!user) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      );
    }

    const unreadMessages = await prisma.message.findMany({
      where: {
        lu: false,
        auteurId: { not: user.id },
        conversation: {
          participants: {
            some: {
              utilisateurId: user.id,
              // ⚠️ mets ici le BON nom de champ Prisma :
              // supprime / deleted / etc.
              supprime: false,
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        auteur: {
          select: {
            id: true,
            pseudo: true,
            photoUrl: true,
          },
        },
        conversation: {
          select: { id: true },
        },
      },
    });

    return NextResponse.json(unreadMessages);
  } catch (error) {
    console.error("GET /api/messages/nonlus error", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
