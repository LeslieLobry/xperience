// app/api/demandes-acces/[id]/refuser/route.js
import { prisma } from "../../../../../lib/prisma";
import { NextResponse } from "next/server";
import { getUserFromToken } from "../../../../../lib/auth";
import { Rest as AblyRest } from "ably";
import { Resend } from "resend";

export const runtime = "nodejs";

const resend = new Resend(process.env.RESEND_API_KEY);

const ably = new AblyRest(
  process.env.ABLY_API_KEY_SERVER ||
    process.env.ABLY_API_KEY ||
    process.env.NEXT_PUBLIC_ABLY_API_KEY
);

async function publishNotif(userId, payload) {
  if (!userId) return;
  try {
    const channel = ably.channels.get(`notification-${userId}`);
    await channel.publish("notification", payload);
  } catch (e) {
    console.error("Ably publish error", e);
  }
}

async function sendEmailRefused(toEmail, ownerPseudo) {
  if (!toEmail) return;
  try {
    await resend.emails.send({
      from: "Xperiences <no-reply@x-periences.fr>",
      to: [toEmail],
      subject: "Demande d’accès galerie privée refusée",
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.5">
          <h2>Information</h2>
          <p><strong>${ownerPseudo}</strong> a refusé votre demande d’accès à sa galerie privée.</p>
          <p style="color:#666;font-size:12px">Si vous n’êtes pas à l’origine de cette demande, ignorez ce message.</p>
        </div>
      `,
    });
  } catch (e) {
    console.error("Resend email error", e);
  }
}

export async function PATCH(req, { params }) {
  try {
    const demandeId = Number(params.id);
    if (!Number.isFinite(demandeId)) {
      return NextResponse.json({ error: "BAD_ID" }, { status: 400 });
    }

    const me = await getUserFromToken(req);
    if (!me?.id) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const demande = await prisma.demandeAcces.findUnique({
      where: { id: demandeId },
      select: {
        id: true,
        statut: true,
        proprietaireId: true,
        demandeurId: true,
        demandeur: { select: { id: true, email: true, pseudo: true } },
        proprietaire: { select: { id: true, pseudo: true } },
        galeriePrivee: { select: { id: true, nom: true, utilisateurId: true } },
      },
    });

    if (!demande) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

    if (Number(demande.proprietaireId) !== Number(me.id)) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const updated = await prisma.demandeAcces.update({
      where: { id: demandeId },
      data: { statut: "REFUSEE" },
    });

    const ownerPseudo = demande.proprietaire?.pseudo || "Un utilisateur";
    const lien = `/utilisateur/${demande.proprietaireId}`;

    await prisma.notification.create({
      data: {
        utilisateurId: demande.demandeurId,
        auteurId: demande.proprietaireId,
        message: `${ownerPseudo} a refusé votre demande d'accès à sa galerie privée.`,
        lien,
      },
    });

    await publishNotif(demande.demandeurId, {
      kind: "GALERIE_PRIVEE_REFUSEE",
      demandeId: demande.id,
      proprietaireId: demande.proprietaireId,
      ownerPseudo,
      galerieId: demande.galeriePrivee?.id || null,
      galerieNom: demande.galeriePrivee?.nom || null,
      lien,
      at: Date.now(),
    });

    await sendEmailRefused(demande.demandeur?.email, ownerPseudo);

    return NextResponse.json(updated);
  } catch (e) {
    console.error("Erreur refuser demande", e);
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
