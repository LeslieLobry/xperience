// app/api/logout/route.js
import { NextResponse } from "next/server";

// Le CORS est déjà géré par middleware.js → pas d'OPTIONS ici
export async function POST() {
  const res = NextResponse.json({ success: true });

  // 🧹 On supprime le cookie 'token' dans tous les cas possibles
  // 1) Cookie posé avec domaine .x-periences.fr (nouveau comportement recommandé)
  res.cookies.set("token", "", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    domain: ".x-periences.fr",
    path: "/",
    maxAge: 0,
  });

  // 2) Cookie éventuellement posé SANS domaine par le passé
  res.cookies.set("token", "", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  // 3) Ancien cookie éventuel en SameSite=None (historique)
  res.cookies.set("token", "", {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    domain: ".x-periences.fr",
    path: "/",
    maxAge: 0,
  });

  return res;
}
