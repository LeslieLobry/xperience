import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";

const prisma = new PrismaClient();
const secret = process.env.JWT_SECRET;
if (!secret) throw new Error("JWT_SECRET non défini");

export async function POST(req) {
  const { email, password } = await req.json();

  const user = await prisma.utilisateur.findUnique({
    where: { email },
  });

  if (!user) {
    return NextResponse.json({ success: false, message: "Utilisateur introuvable" }, { status: 401 });
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return NextResponse.json({ success: false, message: "Mot de passe incorrect" }, { status: 401 });
  }

  // ✅ Ajout du rôle dans le JWT
  const token = jwt.sign(
    {
      id: user.id,
      email: user.email,
      pseudo: user.pseudo,
      role: user.role, // 🔥 important pour admin
    },
    secret,
    { expiresIn: "7d" }
  );

  // ✅ Création de la réponse avec cookie HTTP-only
  const response = NextResponse.json({ success: true });

  response.cookies.set("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 jours
  });

  return response;
}
