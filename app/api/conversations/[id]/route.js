import { NextResponse } from "next/server";
import { headers } from "next/headers";
import jwt from "jsonwebtoken";
import { prisma } from "../../../../lib/prisma";

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

export async function GET(req) {
  const decoded = getUserFromToken();
  if (!decoded) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const userId = decoded.id;

  try {
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
              select: {
                id: true,
                pseudo: true,
                photoUrl: true,
              },
            },
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    return NextResponse.json({ success: true, conversations });
  } catch (err) {
    console.error("Erreur fetch conversations:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  const decoded = getUserFromToken();
  if (!decoded) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const userId = decoded.id;
  const conversationId = params?.id;

  console.log("🧪 Suppression conversationId =", conversationId);

  if (!conversationId) {
    return NextResponse.json({ error: "ID de conversation manquant" }, { status: 400 });
  }

  try {
    const participant = await prisma.participant.findFirst({
      where: {
        conversationId,
        utilisateurId: userId,
      },
    });

    if (!participant) {
      return NextResponse.json({ error: "Conversation non trouvée ou accès refusé" }, { status: 403 });
    }

    await prisma.participant.update({
      where: { id: participant.id },
      data: { supprimé: true },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("❌ Erreur suppression conversation :", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
