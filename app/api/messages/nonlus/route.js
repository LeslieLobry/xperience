import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import jwt from "jsonwebtoken";
import { cookies, headers } from "next/headers";

const JWT_SECRET = process.env.JWT_SECRET;

/* --------- Récupération du token (header OU cookie) --------- */
function getToken() {
  const h = headers();

  // 1) Auth header (mobile : Authorization: Bearer xxx)
  const auth = h.get("authorization") || h.get("Authorization");
  if (auth && auth.toLowerCase().startsWith("bearer ")) {
    const t = auth.slice(7).trim();
    if (t) return t;
  }

  // 2) Cookie "token" (site web)
  const cookieStore = cookies();
  const cookieToken = cookieStore.get("token")?.value;
  if (cookieToken) return cookieToken;

  return null;
}

async function getUserFromToken() {
  const token = getToken();
  if (!token || !JWT_SECRET) return null;

  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (e) {
    console.error("JWT error in /api/messages/nonlus:", e);
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

    // ✅ VRAIS messages non lus
    const unreadMessages = await prisma.message.findMany({
      where: {
        lu: false,                  // <--- la clé
        auteurId: { not: user.id }, // pas toi
        conversation: {
          participants: {
            some: {
              utilisateurId: user.id, // tu es dans la conversation
              // si tu as un champ "supprime" sur Participant, tu pourras le rajouter ici
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        auteur: {
          select: { id: true, pseudo: true, photoUrl: true },
        },
        conversation: {
          select: { id: true },
        },
      },
    });

    console.log(
      "GET /api/messages/nonlus =>",
      unreadMessages.length,
      "messages (lu = false)"
    );

    return NextResponse.json(unreadMessages);
  } catch (error) {
    console.error("GET /api/messages/nonlus error:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
