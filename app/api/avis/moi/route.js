import { PrismaClient } from "@prisma/client";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();
const secret = process.env.JWT_SECRET;

export async function GET() {
  const token = cookies().get("token")?.value;

  if (!token) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  let payload;
  try {
    payload = jwt.verify(token, secret);
  } catch {
    return NextResponse.json({ error: "Token invalide" }, { status: 403 });
  }

  const utilisateurId = parseInt(payload.id);

  const avis = await prisma.avis.findMany({
    where: { cibleId: utilisateurId },
    include: {
      auteur: {
        select: {
          id: true,
          pseudo: true,
          photoUrl: true
        }
      }
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  return NextResponse.json({ avis });
}
