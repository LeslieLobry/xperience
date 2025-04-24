import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

export async function POST(req) {
  const { token, password } = await req.json();

  if (!token || !password) {
    return Response.json({ success: false, message: "Token ou mot de passe manquant." }, { status: 400 });
  }

  const resetRecord = await prisma.passwordResetToken.findUnique({
    where: { token },
  });

  if (!resetRecord || resetRecord.expiresAt < new Date()) {
    return Response.json({ success: false, message: "Token invalide ou expiré." }, { status: 400 });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  await prisma.utilisateur.update({
    where: { email: resetRecord.email },
    data: { password: hashedPassword },
  });

  await prisma.passwordResetToken.delete({ where: { token } });

  return Response.json({ success: true }, { status: 200 });
}
