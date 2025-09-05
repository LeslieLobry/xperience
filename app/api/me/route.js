// app/api/me/route.js
import { NextResponse } from "next/server";
import { getUserFromToken } from "../../../lib/auth";

const ADMIN_ROLES = ["admin", "superadmin", "owner", "root"];
const normalizeRole = (r) => String(r ?? "").trim().toLowerCase();
const isAdminRole = (r) => ADMIN_ROLES.includes(normalizeRole(r));

// CORS est géré par middleware.js → pas d'OPTIONS ici

export async function GET() {
  // Récupère l'utilisateur depuis cookie (web) OU Authorization Bearer (mobile)
  const u = await getUserFromToken({
    // Sélection légère et précise (perfs)
    select: {
      id: true,
      email: true,
      type: true,
      role: true,
      pseudo: true,
      photoUrl: true,
      age: true,
      description: true,
      localisation: true,
      experience: true,
      rechercheType: true,
      fumeur: true,
      silhouette: true,
      taille: true,
      origines: true,
      yeux: true,
      cheveux: true,
      createdAt: true,
      lastLogin: true,
      verificationDeadline: true,
      verificationIdentiteStatut: true,
      orientation: true,
    },
  });

  if (!u) {
    return NextResponse.json(
      { success: false, message: "Non authentifié." },
      { status: 401 }
    );
  }

  const roleNormalized = normalizeRole(u.role);
  const isAdmin = isAdminRole(u.role);

  return NextResponse.json({
    success: true,
    user: { ...u, roleNormalized, isAdmin },
  });
}
