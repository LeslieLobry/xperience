import { prisma } from "../../../lib/prisma";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";
import crypto from "crypto";
import { Resend } from "resend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const JWT_SECRET = process.env.JWT_SECRET;
const RESEND_API_KEY = process.env.RESEND_API_KEY;

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

const ALLOWED_ORIGINS = [
  "http://localhost:8081",
  "http://localhost:19006",
  "http://localhost:3000",
  "https://www.x-periences.fr",
  "https://x-periences.fr",
];

function corsHeaders(origin = "") {
  const allowOrigin = ALLOWED_ORIGINS.includes(origin)
    ? origin
    : "https://www.x-periences.fr";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Platform",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function safeJson(data) {
  return JSON.parse(
    JSON.stringify(data, (_, v) => (typeof v === "bigint" ? v.toString() : v))
  );
}

export async function OPTIONS(req) {
  const origin = req.headers.get("origin") || "";
  return new Response(null, { status: 204, headers: corsHeaders(origin) });
}

function extractUserIdFromJwtPayload(payload) {
  const raw = payload?.userId ?? payload?.id ?? payload?.utilisateurId ?? null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function escapeHtml(str = "") {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function buildProfileUrl(userId) {
  return `https://www.x-periences.fr/profil/${userId}`;
}

/* -------------------------------------------------------------------------- */
/*                           EMAIL TEMPLATE (SITE)                             */
/* -------------------------------------------------------------------------- */
function renderAvisEmailHTML({ toPseudo, fromPseudo, commentaire, profilUrl }) {
  const gold = "#e0c084";
  const bg = "#0b1220"; // bleu nuit
  const card = "#0f1b2f"; // bleu nuit + clair
  const text = "#ffffff";
  const muted = "rgba(255,255,255,0.78)";
  const border = "rgba(224,192,132,0.28)";

  const safeTo = escapeHtml(toPseudo || "");
  const safeFrom = escapeHtml(fromPseudo || "Un membre");
  const safeComment = escapeHtml(commentaire || "").replaceAll("\n", "<br/>");
  const safeUrl = profilUrl;

  return `
  <div style="margin:0;padding:0;background:${bg};">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
      Vous avez reçu un nouvel avis sur Xperiences.
    </div>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${bg};padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="width:600px;max-width:600px;">
            <tr>
              <td align="center" style="padding:10px 0 18px;">
                <div style="font-family:Arial,sans-serif;font-size:20px;font-weight:800;color:${gold};letter-spacing:0.5px;">
                  XPERIENCES
                </div>
                <div style="font-family:Arial,sans-serif;font-size:12px;color:${muted};margin-top:6px;">
                  Votre espace de rencontres & expériences
                </div>
              </td>
            </tr>

            <tr>
              <td style="
                background:${card};
                border:1px solid ${border};
                border-radius:18px;
                overflow:hidden;
                box-shadow:0 10px 30px rgba(0,0,0,0.35);
              ">
                <div style="padding:22px 22px 18px;font-family:Arial,sans-serif;color:${text};">

                  <div style="font-size:18px;font-weight:800;margin:0 0 8px;">
                    Nouvel avis reçu ✨
                  </div>

                  <div style="font-size:14px;color:${muted};margin:0 0 16px;">
                    Bonjour <strong style="color:${text};">${safeTo}</strong>, vous avez un nouvel avis.
                  </div>

                  <div style="
                    border-left:4px solid ${gold};
                    padding:12px 12px;
                    background:rgba(255,255,255,0.04);
                    border-radius:12px;
                    margin:0 0 14px;
                  ">
                    <div style="font-size:13px;color:${muted};margin-bottom:6px;">
                      De <strong style="color:${text};">${safeFrom}</strong>
                    </div>
                    <div style="font-size:14px;line-height:1.6;color:${text};">
                      ${safeComment}
                    </div>
                  </div>

                  <div style="text-align:center;margin:18px 0 6px;">
                    <a href="${safeUrl}" target="_blank"
                      style="
                        display:inline-block;
                        padding:12px 18px;
                        border-radius:14px;
                        background:${gold};
                        color:#0b1220;
                        text-decoration:none;
                        font-weight:800;
                        font-size:14px;
                      ">
                      Voir mon profil
                    </a>
                  </div>

                  <div style="font-size:12px;color:${muted};text-align:center;margin-top:10px;">
                    Ou copiez ce lien :<br/>
                    <span style="color:${gold};word-break:break-all;">${safeUrl}</span>
                  </div>

                </div>

                <div style="padding:14px 18px;background:rgba(0,0,0,0.18);border-top:1px solid rgba(224,192,132,0.18);">
                  <div style="font-family:Arial,sans-serif;font-size:12px;color:${muted};text-align:center;line-height:1.5;">
                    Vous recevez cet email car vous avez un compte sur Xperiences.<br/>
                    © ${new Date().getFullYear()} Xperiences — Tous droits réservés
                  </div>
                </div>

              </td>
            </tr>

            <tr>
              <td align="center" style="padding:14px 0 0;">
                <div style="font-family:Arial,sans-serif;font-size:12px;color:rgba(255,255,255,0.55);">
                  www.x-periences.fr
                </div>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </div>
  `;
}

async function sendAvisEmail({
  toEmail,
  toPseudo,
  fromPseudo,
  commentaire,
  cibleId,
  requestId,
}) {
  if (!resend) {
    console.warn("⚠️ RESEND_API_KEY manquant, email non envoyé", { requestId });
    return;
  }
  if (!toEmail) return;

  const profilUrl = buildProfileUrl(cibleId);

  try {
    await resend.emails.send({
      from: "Xperiences <no-reply@x-periences.fr>",
      to: [toEmail],
      subject: "Vous avez reçu un nouvel avis ✨",
      html: renderAvisEmailHTML({
        toPseudo,
        fromPseudo,
        commentaire,
        profilUrl,
      }),
    });
  } catch (e) {
    console.error("⚠️ Erreur envoi email avis", {
      requestId,
      message: e?.message,
    });
  }
}

/* -------------------------------------------------------------------------- */
/*                                    POST                                    */
/* -------------------------------------------------------------------------- */
export async function POST(req) {
  const origin = req.headers.get("origin") || "";
  const headers = corsHeaders(origin);
  const requestId = crypto.randomBytes(8).toString("hex");

  try {
    if (!JWT_SECRET) {
      console.error("❌ JWT_SECRET manquant", { requestId });
      return NextResponse.json(
        { error: "Configuration serveur manquante.", requestId },
        { status: 500, headers }
      );
    }

    // Body JSON
    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Body JSON invalide.", requestId },
        { status: 400, headers }
      );
    }

    // Auth: cookie OU Bearer
    const cookieStore = await cookies();
    let token = cookieStore.get("token")?.value;
    const auth = req.headers.get("authorization") || "";
    if (!token && auth.startsWith("Bearer ")) token = auth.slice(7);

    if (!token) {
      return NextResponse.json(
        { error: "Non authentifié", requestId },
        { status: 401, headers }
      );
    }

    let payload;
    try {
      payload = jwt.verify(token, JWT_SECRET);
    } catch {
      return NextResponse.json(
        { error: "Token invalide", requestId },
        { status: 403, headers }
      );
    }

    const auteurId = extractUserIdFromJwtPayload(payload);
    if (!auteurId) {
      return NextResponse.json(
        { error: "Session invalide.", requestId },
        { status: 401, headers }
      );
    }

    const cibleId = Number(body?.cibleId);
    const commentaire = String(body?.commentaire || "").trim();

    if (!Number.isFinite(cibleId) || cibleId <= 0 || !commentaire) {
      return NextResponse.json(
        { error: "Champs requis manquants", requestId },
        { status: 400, headers }
      );
    }

    if (auteurId === cibleId) {
      return NextResponse.json(
        { error: "Vous ne pouvez pas laisser un avis sur vous-même.", requestId },
        { status: 400, headers }
      );
    }

    // Déjà laissé ?
    const existing = await prisma.avis.findUnique({
      where: { auteurId_cibleId: { auteurId, cibleId } },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Vous avez déjà laissé un avis.", requestId },
        { status: 400, headers }
      );
    }

    // ✅ Create avis (on récupère createdAt pour l'affichage)
    const avis = await prisma.avis.create({
      data: { auteurId, cibleId, commentaire },
      select: {
        id: true,
        commentaire: true,
        createdAt: true,
        auteurId: true,
        cibleId: true,
      },
    });

    // ✅ digestNotification (non bloquant) — CORRIGÉ : eventType et pas type
    try {
      await prisma.digestNotification.create({
        data: {
          eventType: "AVIS",
          destinataireId: cibleId,
          avisId: avis.id,
          // conversationId: null
          // messageId: null
        },
      });
    } catch (e) {
      console.error("⚠️ digestNotification erreur", {
        requestId,
        prismaCode: e?.code,
        message: e?.message,
      });
    }

    // ✅ Email (non bloquant)
    try {
      const [dest, auteur] = await Promise.all([
        prisma.utilisateur.findUnique({
          where: { id: cibleId },
          select: { email: true, pseudo: true },
        }),
        prisma.utilisateur.findUnique({
          where: { id: auteurId },
          select: { pseudo: true },
        }),
      ]);

      await sendAvisEmail({
        toEmail: dest?.email,
        toPseudo: dest?.pseudo,
        fromPseudo: auteur?.pseudo,
        commentaire,
        cibleId,
        requestId,
      });
    } catch (e) {
      console.error("⚠️ bloc email avis échoué", {
        requestId,
        message: e?.message,
      });
    }

    return NextResponse.json(safeJson({ success: true, avis, requestId }), {
      headers,
    });
  } catch (error) {
    console.error("❌ Erreur création avis :", {
      requestId,
      prismaCode: error?.code,
      message: error?.message,
    });

    return NextResponse.json(
      { error: "Erreur lors de l'enregistrement.", requestId },
      { status: 500, headers }
    );
  }
}