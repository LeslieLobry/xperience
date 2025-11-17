// app/api/newsletter/abonner/route.js
import { NextResponse } from "next/server";
import { prisma } from "../../lib/prisma";

export async function POST(req) {
  const { email } = await req.json();

  if (!email || !email.includes("@")) {
    return NextResponse.json(
      { success: false, error: "Email invalide" },
      { status: 400 }
    );
  }

  try {
    const deja = await prisma.abonneNewsletter.findUnique({
      where: { email },
    });

    if (deja) {
      return NextResponse.json({
        success: true,
        already: true,
        message: "Vous êtes déjà inscrit à la newsletter.",
      });
    }

    await prisma.abonneNewsletter.create({
      data: { email },
    });

    return NextResponse.json({
      success: true,
      already: false,
      message: "Merci pour votre inscription !",
    });
  } catch (err) {
    console.error("Erreur newsletter:", err);
    return NextResponse.json(
      { success: false, error: "Erreur serveur, réessayez plus tard." },
      { status: 500 }
    );
  }
}
