import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { prisma } from "../../../lib/prisma";

const secret = process.env.JWT_SECRET;
if (!secret) throw new Error("JWT_SECRET non défini");

export async function POST(req) {
  const start = Date.now();
  console.log("⏱️ Login démarré");

  try {
    const { email, password } = await req.json();
    console.log("⏱️ Après req.json()", Date.now() - start);

   const user = await prisma.utilisateur.findUnique({
  where: { email },
  select: {
    id: true,
    email: true,
    pseudo: true,
    password: true,
    role: true,
    photoUrl: true,
  },
});

    console.log("⏱️ Après findUnique", Date.now() - start);

    if (!user) {
      return NextResponse.json({ success: false, message: "Utilisateur introuvable" }, { status: 401 });
    }

    if (!user.password) {
      return NextResponse.json({ success: false, message: "Mot de passe non défini" }, { status: 400 });
    }

    const valid = await bcrypt.compare(password, user.password);
    console.log("⏱️ Après bcrypt.compare", Date.now() - start);

    if (!valid) {
      return NextResponse.json({ success: false, message: "Mot de passe incorrect" }, { status: 401 });
    }

    setTimeout(() => {
  prisma.utilisateur.update({
    where: { id: user.id },
    data: { lastLogin: new Date() },
    select: { id: true },
  }).catch(console.error);
}, 0);

    console.log("⏱️ Après update lastLogin", Date.now() - start);

    const token = jwt.sign(
      { id: user.id, email: user.email, pseudo: user.pseudo, role: user.role, photoUrl: user.photoUrl,},
      secret,
      { expiresIn: "7d" }
    );
    console.log("⏱️ Après jwt.sign", Date.now() - start);

    const response = NextResponse.json({ success: true });

    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    console.log("⏱️ Fin totale login", Date.now() - start);

    return response;
  } catch (error) {
    console.error("Erreur dans /api/login :", error);
    return NextResponse.json(
      { success: false, message: "Erreur serveur : " + error.message },
      { status: 500 }
    );
  }
}
