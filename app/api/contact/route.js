import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const toEmail = "contact@xperience.fr"; // à adapter

export async function POST(req) {
  const { nom, email, message } = await req.json();

  if (!nom || !email || !message) {
    return NextResponse.json({ error: "Tous les champs sont requis." }, { status: 400 });
  }

  try {
    await resend.emails.send({
      from: "Xpériences <noreply@xperience.fr>",
      to: [toEmail],
      subject: `Nouveau message de ${nom}`,
      reply_to: email,
      html: `<p><strong>Nom :</strong> ${nom}</p>
             <p><strong>Email :</strong> ${email}</p>
             <p><strong>Message :</strong><br/>${message.replace(/\n/g, "<br/>")}</p>`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Erreur lors de l'envoi de l'email." }, { status: 500 });
  }
}
