import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

// 🔐 Extraire l'utilisateur connecté depuis le cookie JWT
async function getUserFromCookie() {
  const cookieStore = await cookies();
  const token = (await cookieStore)?.get("token")?.value;
  if (!token || !JWT_SECRET) return null;

  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

// 📘 GET : récupérer un événement (avec participants et créateur)
export async function GET(_req, context) {
  const id = parseInt(context.params.id);

  try {
    const evenement = await prisma.evenement.findUnique({
      where: { id },
      include: {
        participants: {
          select: { id: true, pseudo: true },
        },
        createur: {
          select: { id: true, pseudo: true },
        },
      },
    });

    if (!evenement) {
      return NextResponse.json({ error: "Événement non trouvé" }, { status: 404 });
    }

    return NextResponse.json(evenement);
  } catch (err) {
    console.error("Erreur GET événement :", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// ✏️ PATCH : modifier un événement
export async function PATCH(req, context) {
  const id = parseInt(context.params.id);
  const data = await req.json();

  try {
    const evenement = await prisma.evenement.update({
      where: { id },
      data,
    });

    return NextResponse.json(evenement);
  } catch (err) {
    console.error("Erreur PATCH événement :", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// 🗑️ DELETE : supprimer ou se désinscrire
export async function DELETE(req, context) {
  const id = parseInt(context.params.id);
  const user = await getUserFromCookie();
  const action = req.headers.get("x-action");

  if (action === "leave" && user) {
    // ✅ Se désinscrire
    try {
      await prisma.evenement.update({
        where: { id },
        data: {
          participants: {
            disconnect: { id: user.id },
          },
        },
      });

      return NextResponse.json({ success: true, message: "Désinscription réussie" });
    } catch (err) {
      console.error("Erreur désinscription :", err);
      return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
  }

  // 🗑️ Suppression complète
  try {
    await prisma.evenement.delete({ where: { id } });
    return NextResponse.json({ message: "Événement supprimé" });
  } catch (err) {
    console.error("Erreur DELETE événement :", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// 📨 POST : inscription à un événement
export async function POST(_req, context) {
  const user = await getUserFromCookie();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const id = parseInt(context.params.id);

  try {
    const alreadyRegistered = await prisma.evenement.findFirst({
      where: {
        id,
        participants: {
          some: { id: user.id },
        },
      },
    });

    if (alreadyRegistered) {
      return NextResponse.json({ success: true, message: "Déjà inscrit" });
    }

    await prisma.evenement.update({
      where: { id },
      data: {
        participants: {
          connect: { id: user.id },
        },
      },
    });

    return NextResponse.json({ success: true, message: "Inscription enregistrée" });
  } catch (err) {
    console.error("Erreur inscription événement :", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
