import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma';
import haversine from '../../../lib/haversine';

export async function POST(req) {
  try {
    const { latitude, longitude } = await req.json();

    if (!latitude || !longitude) {
      return NextResponse.json([], { status: 200 });
    }

    const utilisateurs = await prisma.utilisateur.findMany({
      where: {
        NOT: {
          latitude: null,
          longitude: null,
        },
      },
      select: {
        id: true,
        pseudo: true,
        photoUrl: true,
        age: true,
        localisation: true,
        statut: true,
        latitude: true,
        longitude: true,
      },
    });

    const proches = utilisateurs
      .map((u) => {
        const distance = haversine(latitude, longitude, u.latitude, u.longitude);
        return { ...u, distance };
      })
      .filter((u) => u.distance <= 20); // 🔥 filtre ici

    console.log("📍 Position utilisateur :", latitude, longitude);
    console.log("👥 Nombre total :", utilisateurs.length);
    proches.forEach((u) =>
      console.log(`🧭 ${u.pseudo} → ${u.distance.toFixed(2)} km`)
    );

    return NextResponse.json(proches);
  } catch (err) {
    console.error("❌ Erreur API profils-proches :", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
