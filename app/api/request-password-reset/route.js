import { PrismaClient } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";
import { resend } from "../../../lib/resend"; 

const prisma = new PrismaClient();

export async function POST(req) {
  const { email } = await req.json();

  if (!email) {
    return Response.json({ success: false, message: "Email requis." }, { status: 400 });
  }

  const user = await prisma.utilisateur.findUnique({ where: { email } });

  if (!user) {
    return Response.json({ success: true }, { status: 200 });
  }

  const token = uuidv4();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // 1h

  await prisma.passwordResetToken.create({
    data: {
      email,
      token,
      expiresAt,
    },
  });

  const resetUrl = `http://localhost:3000/reinitialiser?token=${token}`;

  await resend.emails.send({
    from: process.env.EMAIL_FROM,
    to: email,
    subject: "Réinitialisation de votre mot de passe",
    html: `
      <p>Vous avez demandé à réinitialiser votre mot de passe.</p>
      <p>Cliquez ici : <a href="${resetUrl}">Réinitialiser mon mot de passe</a></p>
      <p>Ce lien expirera dans 1 heure.</p>
    `,
  });

  return Response.json({ success: true }, { status: 200 });
}
