import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { getUserFromToken } from "../../../../lib/auth";
import { Resend } from "resend";
import { buildBroadcastEmail } from "../../../../lib/emails/buildBroadcastEmail";
import {
  normalizeBroadcastPayload,
  validateBroadcastPayload,
} from "./helpers";

export const runtime = "nodejs";

const resend = new Resend(process.env.RESEND_API_KEY);

function isAdmin(user) {
  return user && user.role === "ADMIN";
}

function uniqueEmails(list = []) {
  return [...new Set(list.map((email) => String(email || "").trim()).filter(Boolean))];
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
        { error: "Aucun destinataire trouvé." },
        { status: 400 }
      );
    }

    const html = buildBroadcastEmail(payload);
    const batchSize = 50;

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize);

      const results = await Promise.allSettled(
        batch.map((email) =>
          resend.emails.send({
            from: "Xperiences <no-reply@x-periences.fr>",
            to: email,
            subject: payload.subject,
            html,
          })
        )
      );

      results.forEach((result) => {
        if (result.status === "fulfilled") successCount += 1;
        else failCount += 1;
      });
    }

    return NextResponse.json({
      ok: true,
      message: `Broadcast terminé : ${successCount} envoyé(s), ${failCount} échec(s).`,
    });
  } catch (error) {
    console.error("Erreur broadcast global :", error);
    return NextResponse.json(
      { error: "Erreur serveur lors de l'envoi global." },
      { status: 500 }
    );
  }
}