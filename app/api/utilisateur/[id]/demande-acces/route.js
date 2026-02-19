import { prisma } from "../../../../../lib/prisma";
import { NextResponse } from "next/server";
import { Resend } from "resend";

export const runtime = "nodejs";

const resend = new Resend(process.env.RESEND_API_KEY);

// Domaine prod (idéalement en env)
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.x-periences.fr";

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

  const settingsUrl = `${APP_URL}/parametres/galerie`;
  const profilUrl = `${APP_URL}/profil/${encodeURIComponent(String(demandeurId || ""))}`;

  const avatar = absoluteUrl(demandeurPhotoUrl) || `${APP_URL}/default.jpg`;
  const initial = (demandeurPseudo || "U").trim().charAt(0).toUpperCase();

  const html = `
  <div style="margin:0;padding:0;background:#0b1220;">
    <div style="max-width:600px;margin:0 auto;padding:24px;">
      
      <div style="padding:18px;background:rgba(44,62,80,0.55);border:1px solid rgba(224,192,132,0.22);border-radius:18px;">
        <div style="font-family:Arial,Helvetica,sans-serif;color:#fff;">
          <div style="font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:rgba(255,255,255,0.72);">
            Xperiences • Galerie privée
          </div>

          <h1 style="margin:10px 0 8px 0;font-size:20px;line-height:1.25;color:#fff;">
            Nouvelle demande d'accès
          </h1>

          <p style="margin:0 0 14px 0;font-size:14px;line-height:1.55;color:rgba(255,255,255,0.86);">
            Salut <b style="color:#fff;">${ownerName}</b> 👋<br/>
            <a href="${profilUrl}" style="color:#e0c084;text-decoration:none;font-weight:800;">
              ${demandeurName}
            </a>
            souhaite accéder à ta galerie privée.
          </p>

          <div style="display:flex;gap:12px;align-items:center;padding:14px;background:rgba(17,24,39,0.65);border:1px solid rgba(224,192,132,0.14);border-radius:16px;">
            
            <a href="${profilUrl}" style="text-decoration:none;">
              <div style="width:58px;height:58px;border-radius:16px;overflow:hidden;flex:0 0 58px;background:rgba(224,192,132,0.12);border:1px solid rgba(224,192,132,0.22);display:flex;align-items:center;justify-content:center;">
                <img src="${avatar}" alt="avatar" width="58" height="58"
                  style="display:block;width:58px;height:58px;object-fit:cover;"
                  onerror="this.style.display='none';this.parentNode.innerHTML='<div style=\\'font-family:Arial;font-weight:800;font-size:20px;color:#e0c084\\'>${escapeHtml(
                    initial
                  )}</div>';" />
              </div>
            </a>

            <div style="flex:1;min-width:0;">
              <div style="font-size:15px;font-weight:800;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                <a href="${profilUrl}" style="color:#fff;text-decoration:none;">
                  ${demandeurName}
                </a>
              </div>
              <div style="font-size:13px;color:rgba(255,255,255,0.74);margin-top:2px;">
                Demande en attente • à valider dans tes réglages
              </div>
            </div>

            <div style="display:flex;gap:10px;flex:0 0 auto;">
              <a href="${profilUrl}" style="display:inline-block;background:rgba(255,255,255,0.08);color:#fff;font-family:Arial,Helvetica,sans-serif;font-weight:800;font-size:13px;padding:10px 12px;border-radius:14px;text-decoration:none;border:1px solid rgba(255,255,255,0.12);">
                Voir le profil
              </a>

              <a href="${settingsUrl}" style="display:inline-block;background:#e0c084;color:#111827;font-family:Arial,Helvetica,sans-serif;font-weight:800;font-size:13px;padding:10px 14px;border-radius:14px;text-decoration:none;">
                Gérer
              </a>
            </div>

          </div>

          <div style="margin-top:14px;font-size:12px;line-height:1.5;color:rgba(255,255,255,0.62);">
            Accepte ou refuse depuis
            <a href="${settingsUrl}" style="color:#e0c084;text-decoration:none;">Paramètres → Galerie</a>.
          </div>
        </div>
      </div>

      <div style="text-align:center;margin-top:14px;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:rgba(255,255,255,0.55);">
        © ${new Date().getFullYear()} Xperiences • Email automatique
      </div>
    </div>
  </div>
  `;

  await resend.emails.send({
    from: "Xperiences <no-reply@x-periences.fr>",
    to: ownerEmail,
    subject: `Nouvelle demande d'accès • ${demandeurPseudo || "nouveau membre"}`,
    html,
  });
}

export async function POST(req, { params }) {
  try {
    const utilisateurId = parseInt(params.id, 10);
    const { visiteurId } = await req.json();

    if (!utilisateurId || !visiteurId) {
      return NextResponse.json({ error: "Données manquantes" }, { status: 400 });
    }

    // Galerie + propriétaire (email/pseudo)
    const galerie = await prisma.galeriePrivee.findUnique({
      where: { utilisateurId },
      include: {
        utilisateur: { select: { id: true, email: true, pseudo: true } },
      },
    });

    if (!galerie) {
      return NextResponse.json({ error: "Galerie non trouvée" }, { status: 404 });
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
      return NextResponse.json({ message: "Demande déjà existante" }, { status: 200 });
    }

    // Demande + demandeur (pseudo + photoUrl)
    const demande = await prisma.demandeAcces.create({
      data: {
        galeriePriveeId: galerie.id,
        demandeurId: visiteurId,
        proprietaireId: utilisateurId,
        statut: "EN_ATTENTE",
      },
      include: {
        demandeur: { select: { id: true, pseudo: true, photoUrl: true } },
      },
    });

    await prisma.notification.create({
      data: {
        utilisateurId,
        auteurId: visiteurId, // ✅ permet d'afficher le profil dans l'app
        message: `Nouvelle demande d'accès à votre galerie privée (${demande.demandeur?.pseudo || "nouveau membre"})`,
        lien: `/parametres/galerie`,
      },
    });

    // Email
    const ownerEmail = galerie.utilisateur?.email;
    if (ownerEmail) {
      try {
        await sendEmailDemandeAcces({
          ownerEmail,
          ownerPseudo: galerie.utilisateur?.pseudo,
          demandeurId: demande.demandeur?.id,
          demandeurPseudo: demande.demandeur?.pseudo,
          demandeurPhotoUrl: demande.demandeur?.photoUrl,
        });
      } catch (mailError) {
        console.error("❌ Erreur envoi email demande accès :", mailError);
      }
    }

    return NextResponse.json(demande);
  } catch (error) {
    console.error("💥 Erreur dans demande d'accès :", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
