import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

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

export async function POST(req, { params }) {
  const user = await getUserFromCookie();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const evenementId = parseInt(params.id);

  try {
    await prisma.evenement.update({
      where: { id: evenementId },
      data: {
        participants: {
          connect: { id: user.id },
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Erreur participation:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
