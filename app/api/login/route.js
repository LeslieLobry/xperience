
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { prisma } from "../../../lib/prisma"; // ✅ chemin à adapter si besoin


const secret = process.env.JWT_SECRET;
if (!secret) throw new Error("JWT_SECRET non défini");

export async function POST(req) {
  try {
    const { email, password } = await req.json();

    const user = await prisma.utilisateur.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json({ success: false, message: "Utilisateur introuvable" }, { status: 401 });
    }

    if (!user.password) {
      return NextResponse.json({ success: false, message: "Mot de passe non défini" }, { status: 400 });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return NextResponse.json({ success: false, message: "Mot de passe incorrect" }, { status: 401 });
    }

    // ✅ Mise à jour de la dernière connexion
    await prisma.utilisateur.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        pseudo: user.pseudo,
        role: user.role,
      },
      secret,
      { expiresIn: "7d" }
    );

    const response = NextResponse.json({ success: true });

    response.cookies.set("token", token, {
      httpOnly: true,
      secure: false,
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error) {
    console.error("Erreur dans /api/login :", error);
    return NextResponse.json(
      { success: false, message: "Erreur serveur : " + error.message },
      { status: 500 }
    );
  }
}

