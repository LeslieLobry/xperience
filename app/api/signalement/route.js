import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { resend } from "../../../lib/resend"; // ⚠️ adapte ce chemin à ton projet
import { prisma } from "../../../lib/prisma";

const JWT_SECRET = process.env.JWT_SECRET;
const MODERATOR_EMAIL = process.env.EMAIL_FROM; 

export async function POST(req) {
  const token = cookies().get("token")?.value;
  if (!token || !JWT_SECRET) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch {
    return NextResponse.json({ error: "Token invalide" }, { status: 403 });
  }

  const { cibleId, motif, commentaire } = await req.json();

  const auteur = await prisma.utilisateur.findUnique({
    where: { id: decoded.id },
    select: { id: true, pseudo: true, email: true }
  });

  const cible = await prisma.utilisateur.findUnique({
    where: { id: parseInt(cibleId) },
    select: { id: true, pseudo: true }
  });

  const html = `
    <h2>🚨 Nouveau signalement utilisateur</h2>
    <p><strong>Signalé par :</strong> ${auteur.pseudo} (id: ${auteur.id}, email: ${auteur.email})</p>
    <p><strong>Membre signalé :</strong> ${cible?.pseudo || "ID " + cibleId} (id: ${cibleId})</p>
    <p><strong>Motif :</strong> ${motif}</p>
    <p><strong>Commentaire :</strong><br>${commentaire || "(aucun commentaire)"}</p>
  `;

  try {
    await resend.emails.send({
  from: MODERATOR_EMAIL,
  to: ["moderation@xperience.fr"], // <-- ou même process.env.EMAIL_FROM si besoin
  subject: "🚨 Signalement...",
  html,
});


    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Erreur lors de l'envoi du mail de signalement :", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
