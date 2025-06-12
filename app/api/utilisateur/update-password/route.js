import { hash, compare } from "bcryptjs";
import { prisma } from "../../../../lib/prisma";
import { NextResponse } from "next/server";
import { getUserFromToken } from "../../../../lib/auth";
import { cookies } from "next/headers";

export async function PATCH(req) {
  try {
    const { currentPassword, newPassword } = await req.json();

    const cookieStore = await cookies(); // ✅ await ici !
    const user = await getUserFromToken(); 
    console.log("🔍 Utilisateur extrait du token :", user);

    if (!user || !user.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const utilisateur = await prisma.utilisateur.findUnique({
      where: { id: user.id },
      select: {
        password: true,
      },
    });

    if (!utilisateur) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    }

    const passwordValid = await compare(currentPassword, utilisateur.password);

    if (!passwordValid) {
      return NextResponse.json({ error: "Mot de passe actuel incorrect" }, { status: 403 });
    }

    const newHashedPassword = await hash(newPassword, 10);

    await prisma.utilisateur.update({
      where: { id: user.id },
      data: { password: newHashedPassword },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("❌ Erreur PATCH /update-password:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
