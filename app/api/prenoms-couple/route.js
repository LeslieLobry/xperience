import { prisma } from "../../../lib/prisma";
import { getUserFromToken } from "../../../lib/auth";
import { NextResponse } from "next/server";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const conversationId = parseInt(searchParams.get("conversationId") || "", 10);

    const user = await getUserFromToken();
    if (!user) {
      return NextResponse.json({ success: false, message: "Non autorisé." }, { status: 401 });
    }

    const record = await prisma.prenomCoupleConversation.findUnique({
      where: {
        conversationId_utilisateurId: {
          conversationId,
          utilisateurId: user.id
        }
      }
    });

    return NextResponse.json({ success: true, prenoms: record }, { status: 200 });
  } catch (err) {
    console.error("Erreur GET /api/prenoms-couple", err);
    return NextResponse.json({ success: false, message: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const user = await getUserFromToken();
    if (!user) {
      return NextResponse.json({ success: false, message: "Non autorisé." }, { status: 401 });
    }

    const { conversationId, prenom1, prenom2 } = await req.json();
    if (!conversationId || !prenom1 || !prenom2) {
      return NextResponse.json({ success: false, message: "Données manquantes" }, { status: 400 });
    }

    const record = await prisma.prenomCoupleConversation.upsert({
      where: {
        conversationId_utilisateurId: {
          conversationId,
          utilisateurId: user.id
        }
      },
      update: {
        prenom1,
        prenom2
      },
      create: {
        conversationId,
        utilisateurId: user.id,
        prenom1,
        prenom2
      }
    });

    return NextResponse.json({ success: true, prenoms: record }, { status: 200 });
  } catch (err) {
    console.error("Erreur POST /api/prenoms-couple", err);
    return NextResponse.json({ success: false, message: "Erreur serveur" }, { status: 500 });
  }
}
