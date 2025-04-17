import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");
  const email = searchParams.get("email");

  if (!token || !email) {
    return Response.json({ success: false, message: "Token ou email manquant." }, { status: 400 });
  }

  const record = await prisma.emailVerificationToken.findUnique({
    where: { token },
  });

  if (!record || record.email !== email) {
    return Response.json({ success: false, message: "Lien invalide." }, { status: 400 });
  }

  if (new Date() > record.expiresAt) {
    return Response.json({ success: false, message: "Lien expiré." }, { status: 400 });
  }

  await prisma.utilisateur.updateMany({
    where: { email },
    data: { emailVerified: new Date() },
  });

  await prisma.emailVerificationToken.delete({
    where: { token },
  });

  return Response.json({ success: true, message: "Email confirmé avec succès." });
}
