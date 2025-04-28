import { PrismaClient } from "@prisma/client";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();
const secret = process.env.JWT_SECRET;

export async function POST(req) {
  const cookieStore = cookies();
  const token = cookieStore.get("token")?.value;

  if (!token) return NextResponse.redirect("/connexion");

  let decoded;
  try {
    decoded = jwt.verify(token, secret);
  } catch (e) {
    return NextResponse.redirect("/connexion");
  }

  const body = await req.json();
  const { recherches, envies } = body;

  // On supprime les anciennes recherches/envies pour cet utilisateur
  await prisma.recherche.deleteMany({
    where: { utilisateurId: decoded.id }
  });

  await prisma.envie.deleteMany({
    where: { utilisateurId: decoded.id }
  });

  // On recrée les nouvelles recherches
  if (recherches && recherches.length > 0) {
    await prisma.recherche.createMany({
      data: recherches.map(label => ({
        label,
        utilisateurId: decoded.id
      }))
    });
  }

  // On recrée les nouvelles envies
  if (envies && envies.length > 0) {
    await prisma.envie.createMany({
      data: envies.map(label => ({
        label,
        utilisateurId: decoded.id
      }))
    });
  }

  return NextResponse.json({ success: true });
}
