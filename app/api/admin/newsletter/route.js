// app/api/admin/newsletter/route.js
import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const fromEmail = "noreply@x-periences.fr";

function buildNewsletterHtml(titre, contenu) {
  const safeContent = contenu.replace(/\n/g, "<br />");

  return `
  <!DOCTYPE html>
  <html lang="fr">
    <head>
      <meta charset="UTF-8" />
      <title>${titre}</title>
    </head>
    <body style="margin:0;padding:0;background-color:#0b0f14;">
      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#0b0f14;padding:20px 0;">
        <tr>
          <td align="center">
            <table width="600" border="0" cellspacing="0" cellpadding="0" style="background:#111722;border-radius:14px;overflow:hidden;border:1px solid rgba(224,192,132,0.25);">
              
              <!-- HEADER -->
              <tr>
                <td style="padding:24px 32px 16px 32px;text-align:center;">
                  <img src="https://www.x-periences.fr/logo.png" alt="X-periences" style="max-width:160px;height:auto;display:block;margin:0 auto 8px auto;" />
                  <p style="margin:0;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#e0c084;">
                    Newsletter X-periences
                  </p>
                </td>
              </tr>

              <!-- TITRE -->
              <tr>
                <td style="padding:0 32px 8px 32px;text-align:left;">
                  <h1 style="margin:0;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:22px;line-height:1.3;color:#ffffff;">
                    ${titre}
                  </h1>
                </td>
              </tr>

              <!-- CONTENU -->
              <tr>
                <td style="padding:8px 32px 24px 32px;">
                  <div style="font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:15px;line-height:1.6;color:#d4d7dd;">
                    ${safeContent}
                  </div>
                </td>
              </tr>

              <!-- CTA -->
              <tr>
                <td style="padding:0 32px 24px 32px;" align="center">
                  <a href="https://www.x-periences.fr" 
                    style="display:inline-block;padding:10px 22px;border-radius:999px;background:#e0c084;color:#0b0f14;text-decoration:none;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;font-weight:600;">
                    Accéder à X-periences
                  </a>
                </td>
              </tr>

              <!-- FOOTER -->
              <tr>
                <td style="padding:16px 32px 24px 32px;border-top:1px solid rgba(224,192,132,0.2);">
                  <p style="margin:0 0 4px 0;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:11px;color:#7f8694;">
                    Vous recevez cet email car vous êtes inscrit·e à la newsletter X-periences.
                  </p>
                  <p style="margin:0;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:11px;color:#7f8694;">
                    Pour gérer vos préférences, connectez-vous à votre espace sur le site.
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>
  `;
}

export async function POST(req) {
  const { titre, contenu } = await req.json();
  if (!titre || !contenu) {
    return NextResponse.json({ error: "Champs requis" }, { status: 400 });
  }

  try {
    await prisma.newsletter.create({ data: { titre, contenu } });

    const abonnes = await prisma.abonneNewsletter.findMany();
    const emails = abonnes.map((a) => a.email);

    if (emails.length === 0) {
      return NextResponse.json(
        { success: false, error: "Aucun abonné à la newsletter." },
        { status: 400 }
      );
    }

    const html = buildNewsletterHtml(titre, contenu);

    await resend.emails.send({
      from: `Xpériences <${fromEmail}>`,
      to: emails,
      subject: titre,
      html,
      text: contenu,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur envoi newsletter :", error);
    return NextResponse.json(
      { error: error.message, stack: error.stack },
      { status: 500 }
    );
  }
}
