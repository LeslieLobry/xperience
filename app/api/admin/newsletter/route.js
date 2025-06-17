
import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma"; // ✅
import { Resend } from "resend";
const resend = new Resend(process.env.RESEND_API_KEY);
const fromEmail = "noreply@x-periences.fr";
export async function POST(req) {
  const { titre, contenu } = await req.json();
  if (!titre || !contenu) return NextResponse.json({ error: "Champs requis" }, { status: 400 });

  try {
    // Enregistre en base
    await prisma.newsletter.create({ data: { titre, contenu } });

    // Récupère les emails
 const abonnes = await prisma.abonneNewsletter.findMany();
const emailsFromDb = abonnes.map((a) => a.email);

// ✅ emails supplémentaires manuels (ex : testeurs, toi, staff)
const emailsManuels = [
  "camille_parruitte@hotmail.fr",
  "marctorlet@gmail.com",
  "jmiceli@mozz-on.com",
  "teamantoine59@gmail.com",
  "frederique.lettoli@gmail.com",
  "aure62300@hotmail.fr",
 "jeremy@charles.co"
];

// 🔁 fusionne et supprime les doublons
const emails = [...new Set([...emailsFromDb, ...emailsManuels])];

    // Envoie la newsletter via Resend
    await resend.emails.send({
      from: `Xpériences <${fromEmail}>`,
      to: emails,
      subject: titre,
      html: contenu,
    });

    return NextResponse.json({ success: true });
  }  catch (error) {
  console.error("Erreur envoi newsletter :", error);
  return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 });
}
}
