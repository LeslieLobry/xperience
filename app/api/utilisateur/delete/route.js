import { compare } from "bcryptjs";
import { prisma } from "../../../../lib/prisma";
import { NextResponse } from "next/server";
import { getUserFromToken } from "../../../../lib/auth";

export async function DELETE(req) {
  try {
    const { password } = await req.json();
    const user = getUserFromToken(); // ✅ cookies().get(...) appelé à l'intérieur

    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const utilisateur = await prisma.utilisateur.findUnique({
      where: { id: user.id },
    });

    if (!utilisateur) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    }

    const passwordMatch = await compare(password, utilisateur.password);

    if (!passwordMatch) {
      return NextResponse.json({ error: "Mot de passe incorrect" }, { status: 403 });
    }

    await prisma.utilisateur.delete({
      where: { id: user.id },
    });

    const response = NextResponse.json({ success: true });

    response.cookies.set("token", "", {
      httpOnly: true,
      secure: true,
      path: "/",
      expires: new Date(0),
    });

    return response;
  } catch (err) {
    console.error("Erreur DELETE /delete :", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
