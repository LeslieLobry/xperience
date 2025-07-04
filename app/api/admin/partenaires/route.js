export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { getUserFromToken } from "../../../../lib/auth";
import { v4 as uuidv4 } from "uuid";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

// S3 config
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});
const BUCKET = process.env.AWS_S3_BUCKET;

// Helper upload S3
async function uploadToS3(file) {
  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = file.name.split('.').pop();
  const key = `partenaires/${uuidv4()}.${ext}`;

  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: buffer,
    ContentType: file.type,
  }));

  return `https://${BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
}

// GET partenaires
export async function GET() {
  try {
    const user = await getUserFromToken();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const partenaires = await prisma.partenaire.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(partenaires);
  } catch (err) {
    console.error("Erreur GET partenaires :", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST partenaire (création)
export async function POST(req) {
  try {
    const user = await getUserFromToken();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const contentType = req.headers.get("content-type") || "";
    let nom, type, lien, photoUrl = null;

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      nom = formData.get("nom");
      type = formData.get("type");
      lien = formData.get("lien");

      const file = formData.get("photo");
      if (file && file.size > 0) {
        photoUrl = await uploadToS3(file);
      }
    } else {
      // fallback JSON (pour debug sans fichier)
      const body = await req.json();
      nom = body.nom;
      type = body.type;
      lien = body.lien;
      photoUrl = body.photoUrl || null;
    }

    if (!nom || !type || !lien) {
      return NextResponse.json({ error: "Champs requis" }, { status: 400 });
    }

    const nouveau = await prisma.partenaire.create({
      data: {
        id: uuidv4(),
        nom,
        type,
        lien,
        photoUrl,
      },
    });

    return NextResponse.json(nouveau);
  } catch (err) {
    console.error("Erreur POST partenaires :", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PUT partenaire (édition)
export async function PUT(req) {
  try {
    const user = await getUserFromToken();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const contentType = req.headers.get("content-type") || "";
    let id, nom, type, lien, photoUrl = null;

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      id = formData.get("id");
      nom = formData.get("nom");
      type = formData.get("type");
      lien = formData.get("lien");

      const file = formData.get("photo");
      if (file && file.size > 0) {
        photoUrl = await uploadToS3(file);
      }
    } else {
      // fallback JSON
      const body = await req.json();
      id = body.id;
      nom = body.nom;
      type = body.type;
      lien = body.lien;
      photoUrl = body.photoUrl || null;
    }

    if (!id || !nom || !type || !lien) {
      return NextResponse.json({ error: "Champs requis" }, { status: 400 });
    }

    const data = { nom, type, lien };
    if (photoUrl) data.photoUrl = photoUrl;

    const updated = await prisma.partenaire.update({
      where: { id },
      data,
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("Erreur PUT partenaires :", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE partenaire
export async function DELETE(req) {
  try {
    const user = await getUserFromToken();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "ID manquant" }, { status: 400 });
    }

    await prisma.partenaire.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Erreur DELETE partenaires :", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
