// app/api/demandes-acces/route.js
import { prisma } from "../../../lib/prisma";
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

import { sendPush } from "../../../lib/push"; // ✅ PUSH EXPO
import Ably from "ably"; // ✅ temps réel

export const runtime = "nodejs";

const JWT_SECRET = process.env.JWT_SECRET;

// ✅ Client Ably REST (clé serveur)
const ably = new Ably.Rest(process.env.ABLY_API_KEY_SERVER);

async function getUserFromToken() {
  const cookieStore = cookies();
  const token = cookieStore.get("token")?.value;
  if (!token || !JWT_SECRET) return null;
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

export async function POST(req) {
  const user = await getUserFromToken();
  if (!user)
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const body = await req.json();
  const { galeriePriveeId } = body;
  if (!galeriePriveeId)
    return NextResponse.json(
      { error: "galeriePriveeId manquant" },
      { status: 400 }
    );

  try {
    const galerieIdNum = Number(galeriePriveeId);
    if (!galerieIdNum || Number.isNaN(galerieIdNum)) {
      return NextResponse.json(
        { error: "galeriePriveeId invalide" },
        { status: 400 }
      );
    }

    // ✅ Récupère la galerie + propriétaire (sinon on ne sait pas qui notifier)
    const galerie = await prisma.galeriePrivee.findUnique({
      where: { id: galerieIdNum },
      select: {
        id: true,
        proprietaireId: true, // ✅ attendu dans la plupart des schémas
      },
    });

    if (!galerie?.proprietaireId) {
      return NextResponse.json(
        { error: "Galerie introuvable" },
        { status: 404 }
      );
    }

    // ✅ empêche auto-demande (si tu veux)
    if (Number(galerie.proprietaireId) === Number(user.id)) {
      return NextResponse.json(
        { error: "Impossible de demander l'accès à ta propre galerie" },
        { status: 400 }
      );
    }

    // ✅ Vérifie s'il n'a pas déjà fait une demande (robuste, ne dépend pas du nom de contrainte Prisma)
    const existingDemande = await prisma.demandeAcces.findFirst({
      where: {
        galeriePriveeId: galerieIdNum,
        demandeurId: Number(user.id),
      },
      select: { id: true },
    });

    if (existingDemande) {
      return NextResponse.json({ error: "Demande déjà faite" }, { status: 400 });
    }

    // ✅ Crée la demande d'accès en statut EN_ATTENTE
    const demande = await prisma.demandeAcces.create({
      data: {
        galeriePriveeId: galerieIdNum,
        demandeurId: Number(user.id),

        // ✅ IMPORTANT : si ton modèle DemandeAcces a proprietaireId obligatoire
        // (dans ton schéma Prisma historique, c'était le cas)
        proprietaireId: Number(galerie.proprietaireId),
      },
    });

    // ✅ Notification interne DB (pour le propriétaire)
    // (garde simple, tu as déjà des notifications côté app)
    await prisma.notification.create({
      data: {
        utilisateurId: Number(galerie.proprietaireId),
        auteurId: Number(user.id),
        message: "a demandé l’accès à ta galerie privée",
        lien: `/parametres`, // web (si tu as une page demandes côté web)
        lu: false,
      },
    });

    // ✅ récupère le token push du propriétaire + pseudo demandeur
    const [owner, demandeur] = await Promise.all([
      prisma.utilisateur.findUnique({
        where: { id: Number(galerie.proprietaireId) },
        select: { expoPushToken: true, pushEnabled: true },
      }),
      prisma.utilisateur.findUnique({
        where: { id: Number(user.id) },
        select: { pseudo: true },
      }),
    ]);

    const pseudoDemandeur = demandeur?.pseudo ?? "Un membre";

    // 🔔 Push Expo (redirection téléphone via data.url => PushRedirector)
    if (owner?.pushEnabled && owner.expoPushToken) {
      try {
        await sendPush(owner.expoPushToken, {
          title: "Demande d’accès 🔒",
          body: `@${pseudoDemandeur} souhaite voir ta galerie privée`,
          data: {
            url: "/(tabs)/parametres", // ✅ mobile route (à adapter si tu as une page dédiée demandes)
            type: "access",
            fromId: Number(user.id),
            galeriePriveeId: galerieIdNum,
          },
        });
      } catch (e) {
        console.warn("⚠️ Échec push ACCESS:", e?.message || e);
      }
    }

    // 📡 Ably temps réel (bannière in-app)
    try {
      const channelName = `user-${Number(galerie.proprietaireId)}`;
      await ably.channels.get(channelName).publish("access-request", {
        pseudo: pseudoDemandeur, // compat
        fromPseudo: pseudoDemandeur, // ✅ standard
        fromId: Number(user.id), // ✅ standard

        galeriePriveeId: galerieIdNum,

        // ✅ mobile
        url: "/(tabs)/notifications",

        // ✅ web (si besoin)
        lien: "/parametres",
      });
    } catch (e) {
      console.warn("⚠️ Ably access-request error:", e?.message || e);
    }

    return NextResponse.json(demande);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}