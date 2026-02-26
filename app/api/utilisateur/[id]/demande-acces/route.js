import { prisma } from "../../../../../lib/prisma";
import { NextResponse } from "next/server";
import { Resend } from "resend";

export const runtime = "nodejs";

const resend = new Resend(process.env.RESEND_API_KEY);

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://www.x-periences.fr";

/* ---------------- Helpers ---------------- */
function safeStr(v) {
  return typeof v === "string" ? v : "";
}

function escapeHtml(str) {
  return safeStr(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function absoluteUrl(url) {
  const u = safeStr(url).trim();
  if (!u) return "";
  if (u.startsWith("http://") || u.startsWith("https://")) return u;
  if (u.startsWith("/")) return `${APP_URL}${u}`;
  return `${APP_URL}/${u}`;
}

/* ---------------- Email ---------------- */

async function sendEmailDemandeAcces({
  ownerEmail,
  ownerPseudo,
  demandeurId,
  demandeurPseudo,
  demandeurPhotoUrl,
}) {
  if (!ownerEmail) return;

  const ownerName = escapeHtml(ownerPseudo || "Utilisateur");
  const demandeurName = escapeHtml(demandeurPseudo || "Un membre");

  const profilUrl = `${APP_URL}/profil/${demandeurId}`;
  const settingsUrl = `${APP_URL}/parametres/galerie`;

  const avatar =
    absoluteUrl(demandeurPhotoUrl) || `${APP_URL}/default.jpg`;

  const html = `
  <div style="margin:0;padding:0;background:#0b1220;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0b1220;">
      <tr>
        <td align="center" style="padding:24px;">
          
          <table width="600" cellpadding="0" cellspacing="0" border="0"
            style="max-width:600px;width:100%;border-radius:18px;">
            
            <tr>
              <td style="background:#1f2c3a;border-radius:18px;padding:20px;">
                
                <div style="font-family:Arial,Helvetica,sans-serif;color:#ffffff;">
                  
                  <div style="font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#cbd5e1;">
                    Xperiences • Galerie privée
                  </div>

                  <div style="font-size:24px;font-weight:800;margin:10px 0;">
                    Nouvelle demande d'accès
                  </div>

                  <div style="font-size:14px;line-height:1.5;margin-bottom:16px;">
                    Salut <strong>${ownerName}</strong> 👋<br/>
                    <a href="${profilUrl}" style="color:#e0c084;text-decoration:none;font-weight:700;">
                      ${demandeurName}
                    </a> souhaite accéder à ta galerie privée.
                  </div>

                  <!-- Card -->
                  <table width="100%" cellpadding="0" cellspacing="0" border="0"
                    style="background:#111827;border-radius:16px;padding:12px;">
                    <tr>
                      
                      
                      <!-- Infos -->
                      <td valign="top" style="padding:10px;">
                        <div style="font-size:16px;font-weight:800;">
                          <a href="${profilUrl}" style="color:#ffffff;text-decoration:none;">
                            ${demandeurName}
                          </a>
                        </div>
                        <div style="font-size:13px;color:#9ca3af;margin-top:4px;">
                          Demande en attente • à valider dans tes réglages
                        </div>
                      </td>

                    </tr>

                    <!-- Buttons -->
                    <tr>
                      <td colspan="2" style="padding:12px;">
                        
                        <table width="100%" cellpadding="0" cellspacing="0" border="0">
                          <tr>
                            <td style="padding-bottom:10px;">
                              <a href="${profilUrl}"
                                style="display:block;text-align:center;background:#1f2937;color:#ffffff;font-weight:800;padding:12px;border-radius:12px;text-decoration:none;border:1px solid #334155;">
                                Voir le profil
                              </a>
                            </td>
                          </tr>
                          <tr>
                            <td>
                              <a href="${settingsUrl}"
                                style="display:block;text-align:center;background:#e0c084;color:#111827;font-weight:900;padding:12px;border-radius:12px;text-decoration:none;">
                                Gérer la demande
                              </a>
                            </td>
                          </tr>
                        </table>

                      </td>
                    </tr>

                  </table>

                  <div style="margin-top:16px;font-size:12px;color:#94a3b8;">
                    Tu peux accepter ou refuser depuis 
                    <a href="${settingsUrl}" style="color:#e0c084;text-decoration:none;">
                      Paramètres → Galerie
                    </a>.
                  </div>

                </div>

              </td>
            </tr>

            <tr>
              <td align="center" style="padding:16px 0;font-size:11px;color:#64748b;font-family:Arial;">
                © ${new Date().getFullYear()} Xperiences • Email automatique
              </td>
            </tr>

          </table>

        </td>
      </tr>
    </table>
  </div>
  `;

  await resend.emails.send({
    from: "Xperiences <no-reply@x-periences.fr>",
    to: ownerEmail,
    subject: `Nouvelle demande d'accès • ${demandeurPseudo}`,
    html,
  });
}

/* ---------------- Route ---------------- */

export async function POST(req, { params }) {
  try {
    const utilisateurId = parseInt(params.id, 10);
    const { visiteurId } = await req.json();

    if (!utilisateurId || !visiteurId) {
      return NextResponse.json(
        { error: "Données manquantes" },
        { status: 400 }
      );
    }

    const galerie = await prisma.galeriePrivee.findUnique({
      where: { utilisateurId },
      include: {
        utilisateur: {
          select: { id: true, email: true, pseudo: true },
        },
      },
    });

    if (!galerie) {
      return NextResponse.json(
        { error: "Galerie non trouvée" },
        { status: 404 }
      );
    }

    const existing = await prisma.demandeAcces.findUnique({
      where: {
        galeriePriveeId_demandeurId: {
          galeriePriveeId: galerie.id,
          demandeurId: visiteurId,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { message: "Demande déjà existante" },
        { status: 200 }
      );
    }

    const demande = await prisma.demandeAcces.create({
      data: {
        galeriePriveeId: galerie.id,
        demandeurId: visiteurId,
        proprietaireId: utilisateurId,
        statut: "EN_ATTENTE",
      },
      include: {
        demandeur: {
          select: { id: true, pseudo: true, photoUrl: true },
        },
      },
    });

    await prisma.notification.create({
      data: {
        utilisateurId,
        auteurId: visiteurId,
        message: `Nouvelle demande d'accès (${demande.demandeur?.pseudo})`,
        lien: `/parametres/galerie`,
      },
    });

    if (galerie.utilisateur?.email) {
      await sendEmailDemandeAcces({
        ownerEmail: galerie.utilisateur.email,
        ownerPseudo: galerie.utilisateur.pseudo,
        demandeurId: demande.demandeur.id,
        demandeurPseudo: demande.demandeur.pseudo,
        demandeurPhotoUrl: demande.demandeur.photoUrl,
      });
    }

    return NextResponse.json(demande);
  } catch (error) {
    console.error("💥 Erreur demande accès :", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
