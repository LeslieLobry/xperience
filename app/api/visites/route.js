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

    // ✅ notif interne (DB)
    await prisma.notification.create({
      data: {
        utilisateurId: visiteIdNum,
        auteurId: Number(user.id),
        message: "a visité ton profil",
        lien: `/profil/${user.id}`, // ⚠️ on garde pour le web
        lu: false,
      },
    });

    // récupérer cible + pseudo visiteur
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

    // 🔔 PUSH EXPO (CORRIGÉE POUR REDIRECTION MOBILE)
    if (cible?.pushEnabled && cible.expoPushToken) {
      try {
        await sendPush(cible.expoPushToken, {
          title: "Nouvelle visite 👀",
          body: `@${pseudoVisiteur} a visité ton profil`,
          data: {
            url: `/(tabs)/profil/${Number(user.id)}`, // ✅ mobile route
            type: "visit",
            userId: Number(user.id),
            visiteurId: Number(user.id), // compat ancien mapping
          },
        });
        console.log("🔔 Push VISITE envoyée");
      } catch (e) {
        console.warn("⚠️ Échec push VISITE:", e?.message || e);
      }
    } else {
      console.log("ℹ️ Aucun token/opt-in pour le visité — pas de push envoyée");
    }

    // 📡 Ably temps réel (CORRIGÉ MOBILE + WEB)
    try {
      const channelName = `user-${visiteIdNum}`;

      await ably.channels.get(channelName).publish("new-visit", {
        pseudo: pseudoVisiteur,
        fromPseudo: pseudoVisiteur,
        visiteurId: Number(user.id),
        fromId: Number(user.id),

        // ✅ mobile
        url: `/(tabs)/profil/${Number(user.id)}`,

        // ✅ web (on garde pour compatibilité)
        lien: `/profil/${Number(user.id)}`,
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