import { NextResponse } from "next/server";
import { getUserFromToken } from "../../../lib/auth";
import { prisma } from "../../../lib/prisma";
import { sendPush } from "../../../lib/push"; // 🔔 helper push

export async function POST(req) {
  try {
    const user = await getUserFromToken();
    if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const { visiteId } = await req.json();
    if (!visiteId) return NextResponse.json({ error: "ID cible manquant" }, { status: 400 });

    const visiteIdNum = Number(visiteId);
    console.log("📥 VISITE reçue :", { visiteur: user.id, visite: visiteIdNum });

    if (user.id === visiteIdNum) {
      return NextResponse.json({ message: "Auto-visite ignorée" }, { status: 200 });
    }

    // ✅ déjà visité aujourd'hui ?
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const dejaVu = await prisma.visiteProfil.findFirst({
      where: {
        visiteurId: user.id,
        visiteId: visiteIdNum,
        date: { gte: startOfDay },
      },
      select: { id: true },
    });

    if (dejaVu) {
      return NextResponse.json({ message: "Déjà visité aujourd'hui" }, { status: 200 });
    }

    // ✅ création de la visite
    const created = await prisma.visiteProfil.create({
      data: {
        visiteurId: user.id,
        visiteId: visiteIdNum,
      },
      select: { id: true, visiteId: true, visiteurId: true, date: true },
    });

    console.log("✅ Visite enregistrée :", created);

    // ✅ notification interne (DB)
    await prisma.notification.create({
      data: {
        utilisateurId: visiteIdNum,
        message: "Quelqu'un a visité ton profil",
        lien: `/profil/${user.id}`,
        lu: false,
      },
    });

    // ✅ push Expo immédiate
    // - récupère token + opt-in du visité
    const cible = await prisma.utilisateur.findUnique({
      where: { id: visiteIdNum },
      select: { expoPushToken: true, pushEnabled: true },
    });
    // - récupère le pseudo du visiteur pour le texte
    const visiteur = await prisma.utilisateur.findUnique({
      where: { id: user.id },
      select: { pseudo: true },
    });

    if (cible?.pushEnabled && cible.expoPushToken) {
      try {
        await sendPush(cible.expoPushToken, {
          title: "Nouvelle visite 👀",
          body: `@${visiteur?.pseudo ?? "Un membre"} a visité ton profil`,
          data: { type: "VISITE", visiteurId: user.id },
        });
        console.log("🔔 Push VISITE envoyée");
      } catch (e) {
        console.warn("⚠️ Échec push VISITE:", e?.message || e);
      }
    } else {
      console.log("ℹ️ Aucun token/opt-in pour le visité — pas de push envoyée");
    }

    // ✅ ajout au Digest (eventType = VISITE)
    await prisma.digestNotification.create({
      data: {
        destinataireId: visiteIdNum,
        visiteId: created.id,
        eventType: "VISITE",
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("❌ Erreur enregistrement visite :", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
