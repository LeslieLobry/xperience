import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import fs from "fs";

const JWT_SECRET = process.env.JWT_SECRET;

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

// 📘 GET : récupérer un événement (avec participants et créateur)
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

// ✏️ PUT : modifier un événement (support FormData pour image)
export async function PUT(req, contextPromise) {
  const context = await contextPromise;
  const id = parseInt(context.params.id, 10);
  const formData = await req.formData();

  // On récupère tous les champs attendus
  const data = {};
  for (const key of formData.keys()) {
    data[key] = formData.get(key);
  }

  // Correction date : passage en ISO si besoin
  if (data.date) {
    try {
      data.date = new Date(data.date).toISOString();
    } catch {
      return NextResponse.json({ error: "Date invalide" }, { status: 400 });
    }
  }

  // Gestion de l’image (si fournie)
  if (formData.get("image") && formData.get("image").size > 0) {
    const image = formData.get("image");
    const buffer = Buffer.from(await image.arrayBuffer());
    const filename = `${Date.now()}_${image.name}`;
    fs.writeFileSync(`public/uploads/${filename}`, buffer);
    data.imageUrl = `/uploads/${filename}`;
  }
  delete data.imageFile;

  // Correction des types (Float)
  const fieldsToFloat = ["tarifCouple", "tarifFemme", "tarifHomme", "latitude", "longitude"];
  fieldsToFloat.forEach((field) => {
    if (
      data[field] !== undefined &&
      data[field] !== null &&
      data[field] !== "" &&
      data[field] !== "null"
    ) {
      data[field] = parseFloat(data[field]);
      if (isNaN(data[field])) data[field] = null;
    } else {
      data[field] = null;
    }
  });

  // Champ string "null" ou "" → null
  ["lien", "imageUrl"].forEach((field) => {
    if (data[field] === "null" || data[field] === "") data[field] = null;
  });

  // Enlève les champs non éditables
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
    console.error("Erreur PUT événement :", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// PATCH : optionnel (pour update partiel via JSON)
export async function PATCH(req, contextPromise) {
  const context = await contextPromise;
  const id = parseInt(context.params.id, 10);
  const data = await req.json();

  // Correction date : passage en ISO si besoin
  if (data.date) {
    try {
      data.date = new Date(data.date).toISOString();
    } catch {
      return NextResponse.json({ error: "Date invalide" }, { status: 400 });
    }
  }

  // Correction des types (Float)
  const fieldsToFloat = ["tarifCouple", "tarifFemme", "tarifHomme", "latitude", "longitude"];
  fieldsToFloat.forEach((field) => {
    if (
      data[field] !== undefined &&
      data[field] !== null &&
      data[field] !== "" &&
      data[field] !== "null"
    ) {
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

// 🗑️ DELETE : supprimer ou se désinscrire
export async function DELETE(req, contextPromise) {
  const context = await contextPromise;
  const id = parseInt(context.params.id, 10);
  const user = await getUserFromCookie();
  const action = req.headers.get("x-action");

  if (action === "leave" && user) {
    // ✅ Se désinscrire
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

  // 🗑️ Suppression complète
  try {
    await prisma.evenement.delete({ where: { id } });
    return NextResponse.json({ message: "Événement supprimé" });
  } catch (err) {
    console.error("Erreur DELETE événement :", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// 📨 POST : inscription à un événement
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
