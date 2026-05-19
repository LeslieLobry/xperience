import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { getUserFromToken } from "../../../../lib/auth";
import {
  normalizeBroadcastPayload,
  validateBroadcastPayload,
} from "./helpers";

export const runtime = "nodejs";

function isAdmin(user) {
  return user && user.role === "ADMIN";
}

function isValidEmail(email = "") {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());
}

function uniqueEmails(list = []) {
  return [
    ...new Set(
      list
        .map((email) => String(email || "").trim().toLowerCase())
        .filter(isValidEmail)
    ),
  ];
}

export async function POST(request) {
  try {
    const user = await getUserFromToken(request);

    if (!user) {
      return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
    }

    if (!isAdmin(user)) {
      return NextResponse.json({ error: "Accès refusé." }, { status: 403 });
    }

    const body = await request.json();
    const payload = normalizeBroadcastPayload(body);
    const validationError = validateBroadcastPayload(payload);

    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const utilisateurs = await prisma.utilisateur.findMany({
      where: {
        email: {
          not: null,
        },
      },
      select: {
        email: true,
      },
    });

    const emails = uniqueEmails(utilisateurs.map((u) => u.email));

    if (!emails.length) {
      return NextResponse.json(
        { error: "Aucun destinataire valide trouvé." },
        { status: 400 }
      );
    }

    const campaign = await prisma.broadcastCampaign.create({
      data: {
        subject: payload.subject,
        preheader: payload.preheader || null,
        title: payload.title || null,
        intro: payload.intro || null,
        message: payload.message,
        ctaLabel: payload.ctaLabel || null,
        ctaUrl: payload.ctaUrl || null,
        signature: payload.signature || null,
        status: "PENDING",
        total: emails.length,
        recipients: {
          create: emails.map((email) => ({
            email,
            status: "PENDING",
          })),
        },
      },
    });

    return NextResponse.json({
      ok: true,
      campaignId: campaign.id,
      total: emails.length,
      message: `Campagne créée avec ${emails.length} destinataire(s). L’envoi va se faire progressivement.`,
    });
} catch (error) {
  console.error("Erreur création broadcast :", {
    message: error?.message,
    stack: error?.stack,
    code: error?.code,
    name: error?.name,
  });

  return NextResponse.json(
    {
      error:
        error?.message ||
        "Erreur serveur lors de la création du broadcast.",
    },
    { status: 500 }
  );
}
}