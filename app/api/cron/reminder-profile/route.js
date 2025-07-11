import { prisma } from '../../../../lib/prisma';
import { resend } from '../../../../lib/resend'; 
import { NextResponse } from 'next/server';



export async function GET() {
  // 1. Cherche les users à relancer
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const users = await prisma.utilisateur.findMany({
    where: {
      createdAt: { lte: twentyFourHoursAgo },
      profilComplet: false,
      reminderSent: false,
    },
    select: { id: true, email: true, pseudo: true },
  });

  let sent = 0;

  // 2. Envoie l’email à chacun puis met à jour le champ reminderSent
  for (const user of users) {
    try {
    await resend.emails.send({
  from: 'no-reply@x-periences.fr',
  to: user.email,
  subject: "Il ne vous reste qu'une étape pour vivre de vraies Xperiences...",
  html: `
    <div style="font-family: Raleway, Arial, sans-serif; color: #1a1a1a; font-size: 16px; line-height: 1.6; background: #f7f8fa; padding: 32px 24px;">
      <h2 style="font-weight:700; color:#1a1a1a; margin-bottom: 0.7em;">Bonjour ${user.pseudo || ''},</h2>
      <p>Vous êtes inscrit sur <b>Xperiences</b>, mais votre profil n’est pas encore complété...</p>
      <p style="margin-top:1em;">
        ✨ Pour commencer à échanger, découvrir et vivre des rencontres libertines élégantes et raffinées, votre profil doit refléter qui vous êtes et ce que vous recherchez.
      </p>
      <p>
        👉 <b>Complétez votre profil dès maintenant</b> pour rejoindre la communauté Xperiences dans les meilleures conditions.
      </p>
      <p>
        🔐 Une photo, une description, vos préférences... Il ne vous reste qu’un petit pas à faire pour plonger dans l’univers du désir, de l’élégance et de la liberté.
      </p>
      <div style="margin:2em 0;">
        <a href="https://x-periences.fr/accueil-page"
          style="display:inline-block;background:#1a1a1a;color:#fff;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:600;font-size:18px;letter-spacing:1px;">
          ➡️ Compléter mon profil maintenant
        </a>
      </div>
      <p style="margin-top:1.5em;">🎁 <b>Petit bonus</b> : Les profils complets sont mis en avant automatiquement dans les recherches !</p>
      <p style="margin-top:2.5em;">
        À très vite sur <a href="https://x-periences.fr" style="color:#0070f3;text-decoration:underline;">x-periences.fr</a><br>
        <b>L’équipe Xperiences</b><br>
        <i>Où l’élégance rencontre le désir.</i>
      </p>
      <div style="text-align:center; margin-bottom: 2em;">
  <img src="https://x-periences.fr/logo.png" alt="Xperiences" style="height:60px;"/>
</div>

    </div>
  `,
});


      await prisma.utilisateur.update({
        where: { id: user.id },
        data: { reminderSent: true },
      });

      sent++;
    } catch (e) {
      console.error('Erreur envoi email:', e);
    }
  }
if (sent > 0) {
  // Récupère les emails relancés pour récap
  const relances = users
    .filter((u, i) => i < sent) // Sélectionne seulement ceux vraiment relancés (normalement = users.length)
    .map(u => `- ${u.pseudo || u.email} (${u.email})`)
    .join('<br>');

  await resend.emails.send({
    from: 'no-reply@x-periences.fr',
    to: 'contact@x-periences.fr',
    subject: `Récap Cron : ${sent} relances profil envoyées`,
    html: `
      <div style="font-family:Arial,sans-serif">
        <h2>Cron Xperiences – Récap des relances envoyées</h2>
        <p><b>${sent}</b> mail(s) de rappel profil ont été envoyés ce passage :</p>
        <div style="margin-top:1.5em">
          ${relances}
        </div>
        <p style="margin-top:2em;font-size:13px;color:#888">--<br>Ceci est un email automatique généré par la cron Xperiences.</p>
      </div>
    `
  });
}

  return NextResponse.json({ sent });
}
