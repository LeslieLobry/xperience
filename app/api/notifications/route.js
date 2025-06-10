import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
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

export async function GET(req) {
  try {
    const user = await getUserFromToken();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const notifications = await prisma.notification.findMany({
      where: { utilisateurId: user.id, lu: false },
      orderBy: { createdAt: "desc" },
      take: 20, // limite à 20 notifications récentes
    });

    return NextResponse.json(notifications);
  } catch (error) {
    console.error("Erreur GET notifications:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function PATCH(req) {
  try {
    const user = await getUserFromToken();
    if (!user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    await prisma.notification.updateMany({
      where: { utilisateurId: user.id, lu: false },
      data: { lu: true },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur PATCH notifications:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
