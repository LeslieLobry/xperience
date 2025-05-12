import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { slugify } from "../../../../lib/slugify";

const prisma = new PrismaClient();
const secret = process.env.JWT_SECRET;

export async function POST(req) {
  const cookieStore = cookies();
  const token = cookieStore.get("token")?.value;

  if (!token) {
    return NextResponse.json({ success: false, message: "Non authentifié." }, { status: 401 });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, secret);
  } catch {
    return NextResponse.json({ success: false, message: "Token invalide." }, { status: 403 });
  }

  const { titre, description, contenu, images } = await req.json();

  if (!titre || !contenu) {
    return NextResponse.json({ success: false, message: "Titre et contenu requis." }, { status: 400 });
  }

  const slug = slugify(titre);

  try {
    const article = await prisma.article.create({
      data: {
        titre,
        slug,
        description,
        contenu,
        auteurId: parseInt(decoded.id), // ✅ Sécurité ici
      },
    });

    if (Array.isArray(images)) {
      const imageData = images.map((url) => ({
        url,
        articleId: article.id,
      }));

      await prisma.imageArticle.createMany({ data: imageData });
    }

    return NextResponse.json({ success: true, article });
  } catch (err) {
    console.error("Erreur création article :", err);
    return NextResponse.json({ success: false, message: "Erreur serveur." }, { status: 500 });
  }
}
