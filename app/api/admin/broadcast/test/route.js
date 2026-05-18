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

    console.log("Broadcast global - utilisateurs trouvés :", utilisateurs.length);
    console.log("Broadcast global - emails valides :", emails.length);

    if (!emails.length) {
      return NextResponse.json(
        { error: "Aucun destinataire valide trouvé." },
        { status: 400 }
      );
    }

    const html = buildBroadcastEmail(payload);

    const batchSize = 25;

    let successCount = 0;
    let failCount = 0;
    const failedEmails = [];

    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize);

      const results = await Promise.allSettled(
        batch.map(async (email) => {
          const result = await resend.emails.send({
            from: "Xperiences <no-reply@x-periences.fr>",
            to: email,
            subject: payload.subject,
            html,
          });

          if (result?.error) {
            throw result.error;
          }

          return result;
        })
      );

      results.forEach((result, index) => {
        const email = batch[index];

        if (result.status === "fulfilled") {
          successCount += 1;
        } else {
          failCount += 1;

          failedEmails.push({
            email,
            error:
              result.reason?.message ||
              result.reason?.name ||
              JSON.stringify(result.reason),
          });

          console.error("Erreur email broadcast :", {
            email,
            error: result.reason,
          });
        }
      });
    }

    return NextResponse.json({
      ok: true,
      total: emails.length,
      successCount,
      failCount,
      failedEmails: failedEmails.slice(0, 10),
      message: `Broadcast terminé : ${successCount} envoyé(s), ${failCount} échec(s).`,
    });
  } catch (error) {
    console.error("Erreur broadcast global :", error);

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Erreur serveur lors de l'envoi global.",
      },
      { status: 500 }
    );
  }
}