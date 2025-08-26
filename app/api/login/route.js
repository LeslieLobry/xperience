// app/api/login/route.js
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { prisma } from "../../../lib/prisma";

const secret = process.env.JWT_SECRET;
if (!secret) throw new Error("JWT_SECRET non défini");

// --- CORS ---
const ALLOWED_ORIGINS = [
  "http://localhost:8081",   // Expo web
  "http://localhost:19006",  // Expo dev alt
  // "http://192.168.X.X:8081", // si tu testes depuis un device réel, ajoute l’IP de ton PC
  "https://x-periences.fr",
  "https://www.x-periences.fr",
];

function corsHeaders(origin) {
  const allowOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : "https://x-periences.fr";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Platform",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

export async function OPTIONS(req) {
  const origin = req.headers.get("origin") || "";
  return new Response(null, { status: 204, headers: corsHeaders(origin) });
}

export async function POST(req) {
  const start = Date.now();
  const origin = req.headers.get("origin") || "";
  const headers = corsHeaders(origin);

  // Détecte le mode mobile sans changer d’URL
  const url = new URL(req.url);
  const isMobile =
    req.headers.get("x-platform") === "mobile" || url.searchParams.get("mobile") === "1";

  try {
    const { email, password } = await req.json();
    const normEmail = (email || "").toLowerCase().trim();

    const user = await prisma.utilisateur.findUnique({
      where: { email: normEmail },
      select: {
        id: true,
        email: true,
        pseudo: true,
        password: true, // hash
        role: true,
        photoUrl: true,
        type: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Utilisateur introuvable" },
        { status: 401, headers }
      );
    }
    if (!user.password) {
      return NextResponse.json(
        { success: false, message: "Mot de passe non défini" },
        { status: 400, headers }
      );
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return NextResponse.json(
        { success: false, message: "Mot de passe incorrect" },
        { status: 401, headers }
      );
    }

    // MAJ lastLogin (async, non bloquant)
    setTimeout(() => {
      prisma.utilisateur
        .update({ where: { id: user.id }, data: { lastLogin: new Date() }, select: { id: true } })
        .catch(console.error);
    }, 0);

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        pseudo: user.pseudo,
        role: user.role,
        photoUrl: user.photoUrl,
        type: user.type,
      },
      secret,
      { expiresIn: "7d" }
    );

    // Web: cookie httpOnly. Mobile: renvoie aussi { token, user }.
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

    const res = NextResponse.json(body, { headers });

    res.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return res;
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Erreur serveur : " + (error?.message || "inconnue") },
      { status: 500, headers }
    );
  }
}
