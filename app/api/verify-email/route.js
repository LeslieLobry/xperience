import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  const email = searchParams.get("email");

  if (!token || !email) {
    return Response.json({ success: false, message: "Lien invalide ou incomplet." }, { status: 400 });
  }

  try {
    const record = await prisma.emailVerificationToken.findUnique({
      where: { token },
    });

    if (!record || record.email !== email) {
      return Response.json({ success: false, message: "Lien invalide." }, { status: 401 });
    }

    if (record.expiresAt < new Date()) {
      return Response.json({ success: false, message: "Lien expiré." }, { status: 410 });
    }

    await prisma.utilisateur.update({
      where: { email },
      data: { emailVerified: new Date() },
    });

    await prisma.emailVerificationToken.delete({ where: { token } });

    return Response.json({ success: true, message: "Email confirmé." }, { status: 200 });
  } catch (error) {
    console.error("Erreur vérification :", error);
    return Response.json({ success: false, message: "Erreur serveur." }, { status: 500 });
  }
}
