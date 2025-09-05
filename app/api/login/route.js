// app/api/login/route.js
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { prisma } from "../../../lib/prisma";

const secret = process.env.JWT_SECRET;
if (!secret) throw new Error("JWT_SECRET non défini");

// NOTE: CORS est géré par middleware.js → pas d'OPTIONS ici

export async function POST(req) {
  try {
    const url = new URL(req.url);
    const isMobile =
      req.headers.get("x-platform") === "mobile" || url.searchParams.get("mobile") === "1";

    const { email, password } = await req.json();
    const normEmail = String(email || "").toLowerCase().trim();
    if (!normEmail || !password) {
      return NextResponse.json(
        { success: false, message: "Email et mot de passe requis" },
        { status: 400 }
      );
    }

    const user = await prisma.utilisateur.findUnique({
      where: { email: normEmail },
      select: {
        id: true,
        email: true,
        pseudo: true,
        password: true,       // hash seulement pour comparaison
        role: true,
        photoUrl: true,
        type: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Utilisateur introuvable" },
        { status: 401 }
      );
    }
    if (!user.password) {
      return NextResponse.json(
        { success: false, message: "Mot de passe non défini" },
        { status: 400 }
      );
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return NextResponse.json(
        { success: false, message: "Mot de passe incorrect" },
        { status: 401 }
      );
    }

    // Update lastLogin en tâche de fond
    setTimeout(() => {
      prisma.utilisateur.update({
        where: { id: user.id },
        data: { lastLogin: new Date() },
        select: { id: true },
      }).catch(() => {});
    }, 0);

    // ⚠️ Pour l’instant on garde ton JWT "long" (7j) pour compat.
    // On passera en access court + refresh à l’étape suivante.
    const token = jwt.sign(
      { id: user.id, email: user.email, pseudo: user.pseudo, role: user.role, photoUrl: user.photoUrl, type: user.type },
      secret,
      { expiresIn: "7d", algorithm: "HS256" }
    );

    // Corps de réponse: identique à ton implémentation pour éviter les régressions
    const body = isMobile
      ? {
          success: true,
          token,
          user: {
            id: user.id,
            email: user.email,
            pseudo: user.pseudo,
            photoUrl: user.photoUrl,
            type: user.type,
            role: user.role,
          },
        }
      : { success: true };

    const res = NextResponse.json(body);

    // Cookie web (HTTP-only). Domaine partagé www + apex.
    res.cookies.set("token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",           // ← plus sûr que "none" si pas de cross-site
      domain: ".x-periences.fr", // ← couvre x-periences.fr + www.x-periences.fr
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return res;
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Erreur serveur : " + (error?.message || "inconnue") },
      { status: 500 }
    );
  }
}
