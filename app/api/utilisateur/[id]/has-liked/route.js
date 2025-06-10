import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
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

export async function GET(req, { params }) {
  const cibleId = parseInt(params.id, 10);
  if (!cibleId) {
    return NextResponse.json({ error: "ID cible invalide" }, { status: 400 });
  }

  const user = await getUserFromToken();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const like = await prisma.like.findUnique({
    where: {
      auteurId_cibleId: {
        auteurId: user.id,
        cibleId,
      },
    },
  });

  return NextResponse.json({ hasLiked: Boolean(like) });
}
