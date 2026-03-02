// app/api/admin/verification-identite/route.js

import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { cookies } from "next/headers";
import { getUserFromToken } from "../../../../lib/auth";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3 } from "../../../../lib/s3";
import { resend } from "../../../../lib/resend";

export const runtime = "nodejs";

// Vérifie que l'utilisateur est admin
async function checkAdmin() {
  const cookieStore = cookies();
  const user = await getUserFromToken(cookieStore);
  if (!user || user.role !== "ADMIN") return null;
  return user;
}

// Génère une URL signée S3
async function generateSignedUrl(key) {
  if (!key) return null;
  const command = new GetObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET,
    Key: key,
  });
  return getSignedUrl(s3, command, { expiresIn: 60 * 5 });
}

function labelDoc(code) {
  const map = {
    photoCI1: "Carte d'identité (membre 1)",
    selfie1: "Selfie (membre 1)",
    photoCI2: "Carte d'identité (membre 2)",
    selfie2: "Selfie (membre 2)",
  };
  return map[code] || code;
}

// GET paginé pour l'admin
export async function GET(req) {
  const user = await checkAdmin();
  if (!user) {
    return NextResponse.json(
      { success: false, message: "Non autorisé" },
      { status: 403 }
    );
  }

  try {
    const url = new URL(req.url);
    const statut = url.searchParams.get("statut");
    const page = parseInt(url.searchParams.get("page") || "1", 10);
    const pageSize = parseInt(url.searchParams.get("pageSize") || "20", 10);
    const skip = (page - 1) * pageSize;
    const where = statut ? { statut } : {};

    const [total, demandes] = await Promise.all([
      prisma.verificationIdentite.count({ where }),
      prisma.verificationIdentite.findMany({
        where,
        include: {
          utilisateur: {
            select: {
              pseudo: true,
              nom: true,
              prenom: true,
              email: true, // ✅ utile
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
    ]);

    for (const d of demandes) {
      d.photoCI1Url = await generateSignedUrl(d.photoCI1Url);
      d.selfie1Url = await generateSignedUrl(d.selfie1Url);
      d.photoCI2Url = await generateSignedUrl(d.photoCI2Url);
      d.selfie2Url = await generateSignedUrl(d.selfie2Url);
    }

    return NextResponse.json({ success: true, total, page, pageSize, demandes });
  } catch (err) {
    console.error("Erreur récupération demandes vérif admin:", err);
    return NextResponse.json(
      { success: false, message: "Erreur serveur" },
      { status: 500 }
    );
  }
}

export async function PATCH(req) {
  try {
    const user = await checkAdmin();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Non autorisé" },
        { status: 403 }
      );
    }

    const body = await req.json();
    console.log("✏️ Requête PATCH reçue :", body);

    const numericId = parseInt(body.id, 10);
    if (isNaN(numericId)) {
      return NextResponse.json(
        { success: false, message: "ID invalide" },
        { status: 400 }
      );
    }

    const statut = body.statut;
    if (!statut || !["EN_ATTENTE", "ACCEPTEE", "REFUSEE"].includes(statut)) {
      return NextResponse.json(
        { success: false, message: "Statut invalide" },
        { status: 400 }
      );
    }

    // ✅ NOUVEAU : motif + docs refusés (envoyés par ton modal)
    const commentaire =
      typeof body.commentaire === "string" ? body.commentaire.trim() : null;

    const documentsRefuses = Array.isArray(body.documentsRefuses)
      ? body.documentsRefuses
      : [];

    // ✅ Si refus : on veut au moins un doc OU un commentaire
    if (statut === "REFUSEE" && documentsRefuses.length === 0 && !commentaire) {
      return NextResponse.json(
        {
          success: false,
          message: "Indique au moins un document refusé ou un commentaire.",
        },
        { status: 400 }
      );
    }

    // ✅ Mise à jour du statut + stockage raison
    await prisma.verificationIdentite.update({
      where: { id: numericId },
      data: {
        statut,
        commentaire: commentaire || null,
        documentsRefuses: statut === "REFUSEE" ? documentsRefuses : null, // ✅ reset si acceptée
      },
    });

    // Récupère l'entrée mise à jour avec utilisateur
    const updated = await prisma.verificationIdentite.findUnique({
      where: { id: numericId },
      include: { utilisateur: true },
    });

    if (!updated) {
      return NextResponse.json(
        { success: false, message: "Demande introuvable" },
        { status: 404 }
      );
    }

    // Mise à jour du champ booléen dans Utilisateur
    await prisma.utilisateur.update({
      where: { id: updated.utilisateurId },
      data: {
        verificationIdentiteStatut: statut === "ACCEPTEE",
      },
    });

    // ✅ Email à l’utilisateur : accepté / refusé + détail
    if (updated.utilisateur?.email) {
      const objet =
        statut === "ACCEPTEE"
          ? "✅ Votre vérification d'identité a été validée"
          : "❌ Votre vérification d'identité a été refusée";

      let message = "";

      if (statut === "ACCEPTEE") {
        message = `Bonjour ${updated.utilisateur.prenom || updated.utilisateur.pseudo},

✅ Votre vérification d'identité a bien été acceptée.
Vous bénéficiez désormais du badge "profil vérifié" sur votre profil.

Merci de votre confiance,
L'équipe Xperience`;
      } else {
        const docs = Array.isArray(updated.documentsRefuses)
          ? updated.documentsRefuses.map(labelDoc)
          : [];

        const docsText = docs.length
          ? `Documents rejetés :\n- ${docs.join("\n- ")}\n\n`
          : "";

        const motifText = updated.commentaire
          ? `Motif : ${updated.commentaire}\n\n`
          : "";

        message = `Bonjour ${updated.utilisateur.prenom || updated.utilisateur.pseudo},

❌ Votre vérification d'identité a été refusée.

${docsText}${motifText}Vous pouvez renvoyer vos documents depuis votre profil.
Conseils : photo nette, sans reflet, document complet et lisible.

L'équipe Xperience`;
      }

      try {
        await resend.emails.send({
          from: process.env.EMAIL_FROM,
          to: updated.utilisateur.email,
          subject: objet,
          text: message,
        });
      } catch (e) {
        console.error("❌ Erreur lors de l’envoi de l’email :", e);
      }
    }

    return NextResponse.json({ success: true, updated });
  } catch (error) {
    console.error("Erreur mise à jour vérification admin:", error);
    return NextResponse.json(
      { success: false, message: "Erreur serveur" },
      { status: 500 }
    );
  }
}