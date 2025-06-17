import { NextResponse } from "next/server";
import { getUserFromToken } from "../../../lib/auth";
import { cookies } from "next/headers";

export async function GET() {
  try {
    const user = await getUserFromToken(cookies()); // ✅ injecte le cookieStore
console.log("🔐 SECRET =", process.env.JWT_SECRET)
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Non authentifié." },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        pseudo: user.pseudo,
        photoUrl: user.photoUrl,
        recherches: user.recherches,
        envies: user.envies,
        age: user.age,
        description: user.description,
        localisation: user.localisation,
        experience: user.experience,
        rechercheType: user.rechercheType,
        sexe: user.sexe,
        fumeur: user.fumeur,
        silhouette: user.silhouette,
        taille: user.taille,
        origines: user.origines,
        yeux: user.yeux,
        cheveux: user.cheveux,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
      },
    });
  } catch (err) {
    console.error("❌ Erreur API /me :", err.message);
    return NextResponse.json(
      { success: false, message: "Erreur serveur ou token invalide." },
      { status: 500 }
    );
  }
}
