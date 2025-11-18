// app/api/notifications/[id]/route.js
import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

const JWT_SECRET = process.env.JWT_SECRET || "";

async function getUserFromRequest(req) {
  const auth = req.headers.get("authorization") || "";
  const match = auth.match(/^Bearer\s+(.+)$/i);
  const tokenHeader = match?.[1];

  const cookieStore = cookies();
  const tokenCookie = cookieStore.get("token")?.value;

  const token = tokenHeader || tokenCookie;
  if (!token || !JWT_SECRET) return null;

  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

export async function PATCH(req, { params }) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      );
    }

    const notifId = Number(params.id);
    if (Number.isNaN(notifId)) {
      return NextResponse.json(
        { error: "ID invalide" },
        { status: 400 }
      );
    }

    // on vérifie bien que la notif appartient à cet utilisateur
    const updated = await prisma.notification.updateMany({
      where: {
        id: notifId,
        utilisateurId: Number(user.id),
        lu: false,
      },
      data: {
        lu: true,
      },
    });

    if (updated.count === 0) {
      return NextResponse.json(
        { success: false, message: "Aucune notification mise à jour" },
        { status: 200 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Erreur PATCH /notifications/[id] :", err);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
