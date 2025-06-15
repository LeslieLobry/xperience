import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto"; // ✅ Ajout ici

const JWT_SECRET = process.env.JWT_SECRET;
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

async function getUserFromCookie() {
  const cookieStore = await cookies();
  const token = cookieStore?.get("token")?.value;
  if (!token || !JWT_SECRET) return null;
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

// 📘 GET : récupérer un événement
export async function GET(_req, contextPromise) {
  const context = await contextPromise;
  const id = parseInt(context.params.id, 10);

  try {
    const evenement = await prisma.evenement.findUnique({
      where: { id },
      include: {
        participants: { select: { id: true, pseudo: true } },
        createur: { select: { id: true, pseudo: true } },
      },
    });
    if (!evenement) {
      return NextResponse.json({ error: "Événement non trouvé" }, { status: 404 });
    }
    return NextResponse.json(evenement);
  } catch (err) {
    console.error("Erreur GET événement :", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// ✏️ PUT : modifier un événement (image S3 supportée)
export async function PUT(req, contextPromise) {
  const context = await contextPromise;
  const id = parseInt(context.params.id, 10);
  const user = await getUserFromCookie();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const formData = await req.formData();
  const data = {};

  for (const key of formData.keys()) {
    data[key] = formData.get(key);
  }

  // Formatage de la date
  if (data.date) {
    try {
      data.date = new Date(data.date).toISOString();
    } catch {
      return NextResponse.json({ error: "Date invalide" }, { status: 400 });
    }
  }

  const fieldsToFloat = ["tarifCouple", "tarifFemme", "tarifHomme", "latitude", "longitude"];
  fieldsToFloat.forEach((field) => {
    const value = data[field];
    if (value !== undefined && value !== null && value !== "" && value !== "null") {
      data[field] = parseFloat(value);
      if (isNaN(data[field])) data[field] = null;
    } else {
      data[field] = null;
    }
  });

  ["lien", "imageUrl"].forEach((field) => {
    if (data[field] === "null" || data[field] === "") data[field] = null;
  });

  // Champs non autorisés
  delete data.id;
  delete data.participants;
  delete data.createur;
  delete data.createurId;
  delete data.image;

  const image = formData.get("image");
  if (image && typeof image.name === "string" && image.size > 0) {
    try {
      const extension = image.name.split(".").pop();
      const filename = `evenements/${Date.now()}_${randomUUID()}.${extension}`;
      const buffer = Buffer.from(await image.arrayBuffer());

      await s3.send(
        new PutObjectCommand({
          Bucket: process.env.AWS_S3_BUCKET,
          Key: filename,
          Body: buffer,
          ContentType: image.type,
        })
      );

      data.imageUrl = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${filename}`;
    } catch (err) {
      console.error("Erreur S3 PUT événement :", err);
      return NextResponse.json({ error: "Erreur lors de l’upload image" }, { status: 500 });
    }
  }

  try {
    const updated = await prisma.evenement.update({
      where: { id },
      data,
    });
    return NextResponse.json(updated);
  } catch (err) {
    console.error("Erreur PUT événement :", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// PATCH : update partiel
export async function PATCH(req, contextPromise) {
  const context = await contextPromise;
  const id = parseInt(context.params.id, 10);
  const data = await req.json();

  if (data.date) {
    try {
      data.date = new Date(data.date).toISOString();
    } catch {
      return NextResponse.json({ error: "Date invalide" }, { status: 400 });
    }
  }

  const fieldsToFloat = ["tarifCouple", "tarifFemme", "tarifHomme", "latitude", "longitude"];
  fieldsToFloat.forEach((field) => {
    if (data[field] !== undefined && data[field] !== null && data[field] !== "" && data[field] !== "null") {
      data[field] = parseFloat(data[field]);
      if (isNaN(data[field])) data[field] = null;
    } else {
      data[field] = null;
    }
  });

  ["lien", "imageUrl"].forEach((field) => {
    if (data[field] === "null" || data[field] === "") data[field] = null;
  });

  ["id", "participants", "createur", "createurId"].forEach((field) => {
    delete data[field];
  });

  try {
    const evenement = await prisma.evenement.update({
      where: { id },
      data,
    });
    return NextResponse.json(evenement);
  } catch (err) {
    console.error("Erreur PATCH événement :", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// DELETE : désinscription ou suppression
export async function DELETE(req, contextPromise) {
  const context = await contextPromise;
  const id = parseInt(context.params.id, 10);
  const user = await getUserFromCookie();
  const action = req.headers.get("x-action");

  if (action === "leave" && user) {
    try {
      await prisma.evenement.update({
        where: { id },
        data: {
          participants: { disconnect: { id: user.id } },
        },
      });
      return NextResponse.json({ success: true, message: "Désinscription réussie" });
    } catch (err) {
      console.error("Erreur désinscription :", err);
      return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }
  }

  try {
    await prisma.evenement.delete({ where: { id } });
    return NextResponse.json({ message: "Événement supprimé" });
  } catch (err) {
    console.error("Erreur DELETE événement :", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// POST : inscription
export async function POST(_req, contextPromise) {
  const user = await getUserFromCookie();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const context = await contextPromise;
  const id = parseInt(context.params.id, 10);

  try {
    const alreadyRegistered = await prisma.evenement.findFirst({
      where: {
        id,
        participants: { some: { id: user.id } },
      },
    });
    if (alreadyRegistered) {
      return NextResponse.json({ success: true, message: "Déjà inscrit" });
    }

    await prisma.evenement.update({
      where: { id },
      data: {
        participants: { connect: { id: user.id } },
      },
    });

    return NextResponse.json({ success: true, message: "Inscription enregistrée" });
  } catch (err) {
    console.error("Erreur inscription événement :", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
