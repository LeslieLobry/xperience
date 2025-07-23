import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { cookies } from "next/headers";
import { getUserFromToken } from "../../../../lib/auth";

import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3 } from "../../../../lib/s3";

async function checkAdmin() {
  const cookieStore = cookies();
  const user = await getUserFromToken(cookieStore);

  if (!user || user.role !== "ADMIN") {
    return null; // pas admin ou pas connecté
  }
  return user;
}

async function generateSignedUrl(key) {
  if (!key) return null;
  const command = new GetObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET,
    Key: key,
  });
  // URL valide 5 minutes
  return getSignedUrl(s3, command, { expiresIn: 60 * 5 });
}

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
    const page = parseInt(url.searchParams.get("page")) || 1;
    const pageSize = parseInt(url.searchParams.get("pageSize")) || 20;
    const skip = (page - 1) * pageSize;

    const where = statut ? { statut } : {};

    const [total, demandes] = await Promise.all([
      prisma.verificationIdentite.count({ where }),
      prisma.verificationIdentite.findMany({
        where,
        include: { utilisateur: true },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
    ]);

    // Génère les URLs signées pour chaque image dans chaque demande
    for (const demande of demandes) {
      demande.photoCI1Url = await generateSignedUrl(demande.photoCI1Url);
      demande.selfie1Url = await generateSignedUrl(demande.selfie1Url);
      demande.photoCI2Url = await generateSignedUrl(demande.photoCI2Url);
      demande.selfie2Url = await generateSignedUrl(demande.selfie2Url);
    }

    return NextResponse.json({
      success: true,
      total,
      page,
      pageSize,
      demandes,
    });
  } catch (error) {
    console.error("Erreur récupération demandes vérif admin:", error);
    return NextResponse.json(
      { success: false, message: "Erreur serveur" },
      { status: 500 }
    );
  }
}

export async function PATCH(req) {
  const user = await checkAdmin();
  if (!user) {
    return NextResponse.json(
      { success: false, message: "Non autorisé" },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const { id, statut, commentaire } = body;

    if (!id || !["ACCEPTEE", "REFUSEE", "EN_ATTENTE"].includes(statut)) {
      return NextResponse.json(
        { success: false, message: "Données invalides" },
        { status: 400 }
      );
    }

    const updated = await prisma.verificationIdentite.update({
      where: { id },
      data: { statut, commentaire },
    });

    if (statut === "ACCEPTEE") {
      await prisma.utilisateur.update({
        where: { id: updated.utilisateurId },
        data: { verificationIdentite: true },
      });
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
