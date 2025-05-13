import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

const prisma = new PrismaClient();
const secret = process.env.JWT_SECRET;

export async function POST(req) {
  const { statut } = await req.json();
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;


  if (!token) {
    return NextResponse.json({ success: false, message: "Non authentifié" }, { status: 401 });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, secret);
  } catch {
    return NextResponse.json({ success: false, message: "Token invalide" }, { status: 403 });
  }

  const updated = await prisma.utilisateur.update({
    where: { id: decoded.id },
    data: { statut },
  });

  return NextResponse.json({ success: true, statut: updated.statut });
}
