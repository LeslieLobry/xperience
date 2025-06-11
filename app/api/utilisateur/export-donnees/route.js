import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { resend } from "../../../../lib/resend";
import AdmZip from "adm-zip";

const JWT_SECRET = process.env.JWT_SECRET;
const EMAIL_FROM = process.env.EMAIL_FROM || "contact@tonsite.com";

export async function POST() {
  try {
    const token = cookies().get("token")?.value;
    if (!token || !JWT_SECRET) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    const utilisateur = await prisma.utilisateur.findUnique({
      where: { id: decoded.id },
      include: {
        photos: true,
        galeriesPrivees: true,
        recherches: true,
        envies: true,
        // Ajoute d'autres relations si tu veux un export complet
      },
    });

    if (!utilisateur) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    }

    // 1. Générer les données JSON en mémoire
    const jsonData = JSON.stringify(utilisateur, null, 2);
    const jsonFileName = `donnees-utilisateur-${utilisateur.id}.json`;

    // 2. Créer une archive ZIP en mémoire
    const zip = new AdmZip();
    zip.addFile(jsonFileName, Buffer.from(jsonData, "utf-8"));
    const zipBuffer = zip.toBuffer();

    // 3. Envoyer l'e-mail avec la pièce jointe
    await resend.emails.send({
      from: `Xperience <${EMAIL_FROM}>`,
      to: utilisateur.email,
      subject: "Vos données personnelles - Xperience",
      text: "Voici vos données exportées depuis votre compte Xperience.",
      attachments: [
        {
          filename: `donnees-xperience-${utilisateur.id}.zip`,
          content: zipBuffer.toString("base64"),
        },
      ],
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Erreur export ZIP:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
