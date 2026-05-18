import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { Resend } from "resend";
import { buildBroadcastEmail } from "../../../../lib/emails/buildBroadcastEmail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const resend = new Resend(process.env.RESEND_API_KEY);

const BATCH_SIZE = 50;

export async function GET(request) {
  try {
    const authHeader = request.headers.get("authorization");

    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json(
        { error: "Non autorisé." },
        { status: 401 }
      );
    }

    const campaign = await prisma.broadcastCampaign.findFirst({
      where: {
        status: {
          in: ["PENDING", "SENDING"],
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    if (!campaign) {
      return NextResponse.json({
        ok: true,
        message: "Aucune campagne en attente.",
      });
    }

    await prisma.broadcastCampaign.update({
      where: { id: campaign.id },
      data: {
        status: "SENDING",
      },
    });

    const recipients = await prisma.broadcastRecipient.findMany({
      where: {
        campaignId: campaign.id,
        status: "PENDING",
      },
      take: BATCH_SIZE,
      orderBy: {
        id: "asc",
      },
    });

    if (!recipients.length) {
      await prisma.broadcastCampaign.update({
        where: { id: campaign.id },
        data: {
          status: "DONE",
        },
      });

      return NextResponse.json({
        ok: true,
        message: "Campagne terminée.",
      });
    }

    const html = buildBroadcastEmail({
      subject: campaign.subject,
      preheader: campaign.preheader || "",
      title: campaign.title || campaign.subject,
      intro: campaign.intro || "",
      message: campaign.message,
      ctaLabel: campaign.ctaLabel || "",
      ctaUrl: campaign.ctaUrl || "",
      signature: campaign.signature || "L’équipe Xperiences",
    });

    let sentCount = 0;
    let failCount = 0;

    const results = await Promise.allSettled(
      recipients.map(async (recipient) => {
        const result = await resend.emails.send({
          from: "Xperiences <no-reply@x-periences.fr>",
          to: recipient.email,
          subject: campaign.subject,
          html,
        });

        if (result?.error) {
          throw result.error;
        }

        return recipient;
      })
    );

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const recipient = recipients[i];

      if (result.status === "fulfilled") {
        sentCount++;

        await prisma.broadcastRecipient.update({
          where: {
            id: recipient.id,
          },
          data: {
            status: "SENT",
            sentAt: new Date(),
            error: null,
          },
        });
      } else {
        failCount++;

        await prisma.broadcastRecipient.update({
          where: {
            id: recipient.id,
          },
          data: {
            status: "FAILED",
            error:
              result.reason?.message ||
              JSON.stringify(result.reason),
          },
        });

        console.error("Erreur email :", {
          email: recipient.email,
          error: result.reason,
        });
      }
    }

    const remaining = await prisma.broadcastRecipient.count({
      where: {
        campaignId: campaign.id,
        status: "PENDING",
      },
    });

    await prisma.broadcastCampaign.update({
      where: {
        id: campaign.id,
      },
      data: {
        sentCount: {
          increment: sentCount,
        },
        failCount: {
          increment: failCount,
        },
        status: remaining === 0 ? "DONE" : "SENDING",
      },
    });

    return NextResponse.json({
      ok: true,
      sentThisRun: sentCount,
      failedThisRun: failCount,
      remaining,
    });
  } catch (error) {
    console.error("Erreur cron broadcast :", error);

    return NextResponse.json(
      {
        error: error?.message || "Erreur serveur",
      },
      { status: 500 }
    );
  }
}