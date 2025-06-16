// app/api/newsletter/abonner/route.js
import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export async function POST(req) {
  const { email } = await req.json();

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Email invalide" }, { status: 400 });
  }

  try {
    await prisma.abonneNewsletter.create({
      data: { email },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Déjà inscrit ou erreur" }, { status: 400 });
  }
}
