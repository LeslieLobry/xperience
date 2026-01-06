// app/api/profils/[id]/route.js
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { prisma } from "../../../../lib/prisma";
import { getUserFromToken as getUserFromCookie } from "../../../../lib/auth";

const JWT_SECRET = process.env.JWT_SECRET;

async function getAuthUser(req) {
  // 1) Auth mobile via Bearer
  const auth = req.headers.get("authorization") || "";
  if (auth.startsWith("Bearer ")) {
    const token = auth.slice(7);
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      const user = await prisma.utilisateur.findUnique({
        where: { id: Number(payload.id) },
        select: { id: true },
      });
      if (user) return user;
    } catch {}
  }

  // 2) Auth web via cookie
  try {
    // certains helpers attendent req, d'autres non
    const user = await getUserFromCookie(req);
    if (user) return user;
  } catch {
    try {
      const user = await getUserFromCookie();
      if (user) return user;
    } catch {}
  }

  return null;
}

export async function GET(req, { params }) {
  try {
    const me = await getAuthUser(req);
    if (!me) {
      return NextResponse.json({ message: "Non autorisé" }, { status: 401 });
    }

    const id = Number(params.id);
    if (!id || Number.isNaN(id)) {
      return NextResponse.json({ message: "Id invalide" }, { status: 400 });
    }

    const utilisateur = await prisma.utilisateur.findUnique({
      where: { id },
      select: {
        // Identité de base
        id: true,
        pseudo: true,
        email: true,

        // Visuels / infos publiques
        photoUrl: true,
        age: true,
        localisation: true,
        type: true,
        orientation: true,

        // Statuts & vérification
        statut: true,
        statutAuto: true,
        lastSeenAt: true, // ✅ AJOUT IMPORTANT pour fallback online/offline
        verificationIdentiteStatut: true,

        // Description (utilisée par DescriptionCard)
        description: true,

        // Détails profil (utilisés dans ProfilDetailsSummary)
        experience: true,
        rechercheType: true,
        fumeur: true,
        silhouette: true,
        taille: true,
        origines: true,
        yeux: true,
        cheveux: true,

        // Champs 2e membre si couple
        age2: true,
        fumeur2: true,
        silhouette2: true,
        taille2: true,
        origines2: true,
        yeux2: true,
        cheveux2: true,

        // Préférences (utilisées dans PreferencesSummary)
        recherches: { select: { id: true, label: true } },
        envies: { select: { id: true, label: true } },

        // À propos
        createdAt: true,
        lastLogin: true,
      },
    });

    if (!utilisateur) {
      return NextResponse.json({ message: "Introuvable" }, { status: 404 });
    }

    // Réponse normalisée
    return NextResponse.json({ utilisateur });
  } catch (err) {
    console.error("❌ GET /api/profils/[id] :", err);
    return NextResponse.json({ message: "Erreur serveur" }, { status: 500 });
  }
}
