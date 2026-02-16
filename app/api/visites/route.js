// app/api/visites/route.js
import { NextResponse } from "next/server";
import { getUserFromToken } from "../../../lib/auth";
import { prisma } from "../../../lib/prisma";
import { sendPush } from "../../../lib/push";
import Ably from "ably";

export const runtime = "nodejs";

const ably = new Ably.Rest(process.env.ABLY_API_KEY_SERVER);

export async function POST(req) {
  try {
    const user = await getUserFromToken();
    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { visiteId } = await req.json();
    if (!visiteId) {
      return NextResponse.json({ error: "ID cible manquant" }, { status: 400 });
    }

    const visiteIdNum = Number(visiteId);
    console.log("📥 VISITE reçue :", { visiteur: user.id, visite: visiteIdNum });

    // auto-visite
    if (Number(user.id) === visiteIdNum) {
      return NextResponse.json({ message: "Auto-visite ignorée" }, { status: 200 });
    }

    // déjà visité aujourd'hui ?
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const dejaVu = await prisma.visiteProfil.findFirst({
      where: {
        visiteurId: Number(user.id),
        visiteId: visiteIdNum,
        date: { gte: startOfDay },
      },
      select: { id: true },
    });

    if (dejaVu) {
      return NextResponse.json({ message: "Déjà visité aujourd'hui" }, { status: 200 });
    }

    // création
    const created = await prisma.visiteProfil.create({
      data: {
        visiteurId: Number(user.id),
        visiteId: visiteIdNum,
      },
      select: { id: true, visiteId: true, visiteurId: true, date: true },
    });

    console.log("✅ Visite enregistrée :", created);

    // ✅ notif interne (FIX: auteurId + message sans "Quelqu'un")
    await prisma.notification.create({
      data: {
        utilisateurId: visiteIdNum,       // destinataire
        auteurId: Number(user.id),        // ✅ auteur (visiteur)
        message: "a visité ton profil",   // ✅ plus "Quelqu'un ..."
        lien: `/profil/${user.id}`,
        lu: false,
      },
    });

    // récupérer cible + pseudo visiteur (pour push & Ably)
    const [cible, visiteur] = await Promise.all([
      prisma.utilisateur.findUnique({
        where: { id: visiteIdNum },
        select: { expoPushToken: true, pushEnabled: true },
      }),
      prisma.utilisateur.findUnique({
        where: { id: Number(user.id) },
        select: { pseudo: true },
      }),
    ]);

    const pseudoVisiteur = visiteur?.pseudo ?? "Un membre";

    // 🔔 push Expo
    if (cible?.pushEnabled && cible.expoPushToken) {
      try {
        await sendPush(cible.expoPushToken, {
          title: "Nouvelle visite 👀",
          body: `@${pseudoVisiteur} a visité ton profil`,
          data: { type: "VISITE", visiteurId: Number(user.id) },
        });
        console.log("🔔 Push VISITE envoyée");
      } catch (e) {
        console.warn("⚠️ Échec push VISITE:", e?.message || e);
      }
    } else {
      console.log("ℹ️ Aucun token/opt-in pour le visité — pas de push envoyée");
    }

    // 📡 Ably : event temps réel pour la bannière in-app
    try {
      const channelName = `user-${visiteIdNum}`;
     await ably.channels.get(channelName).publish("new-visit", {
  pseudo: pseudoVisiteur,              // (compat)
  fromPseudo: pseudoVisiteur,          // ✅ AJOUT
  visiteurId: Number(user.id),         // (compat)
  fromId: Number(user.id),             // ✅ AJOUT
  lien: `/profil/${user.id}`,
});

      console.log("📡 Ably new-visit envoyé sur", channelName);
    } catch (e) {
      console.warn("⚠️ Ably new-visit error:", e?.message || e);
    }

    // Digest
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
