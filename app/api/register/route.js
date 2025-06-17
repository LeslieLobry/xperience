
import bcrypt from "bcryptjs";
import { resend } from "../../../lib/resend";
import { v4 as uuidv4 } from "uuid";
import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";


export async function POST(req) {
  try {
    const formData = await req.formData();

    const getField = (key) => formData.get(key);

    const nom = getField("nom");
    const prenom = getField("prenom");
    const pseudo = getField("pseudo");
    const email = getField("email");
    const password = getField("password");
    const type = getField("type");
    const orientation = getField("orientation");
    const age = parseInt(getField("age"));
    const localisation = getField("localisation");
    const consent = getField("consent") === "true";
    const consentCGUDate = consent ? new Date() : null;
    const captchaToken = getField("captchaToken");

    // Gestion du champ recherche[] (peut être array ou string)
    const rawRecherche = formData.getAll("recherche[]") || [];
    const recherche = Array.isArray(rawRecherche) ? rawRecherche : [rawRecherche];

    if (!captchaToken) {
      return NextResponse.json({ success: false, message: "Captcha manquant" }, { status: 400 });
    }

    const captchaSecret = process.env.RECAPTCHA_SECRET_KEY;
    const captchaRes = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `secret=${captchaSecret}&response=${captchaToken}`,
    });

    const captchaData = await captchaRes.json();
    if (!captchaData.success) {
      return NextResponse.json({ success: false, message: "Échec de la vérification reCAPTCHA" }, { status: 400 });
    }

    const exists = await prisma.utilisateur.findFirst({
      where: { OR: [{ email }, { pseudo }] },
    });

    if (exists) {
      return NextResponse.json({ success: false, message: "Email ou pseudo déjà utilisé" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const photoPath = null; // ou "/default.jpg"

    const user = await prisma.utilisateur.create({
      data: {
        nom,
        prenom,
        pseudo,
        email,
        password: hashedPassword,
        type,
        orientation,
        age,
        localisation,
        consent,
        consentCGU: consent,
        consentCGUDate,
        photoUrl: photoPath,
        verificationIdentite: false,
        verificationDeadline: new Date(Date.now() + 48 * 60 * 60 * 1000),
        recherches: {
          create: recherche.map((label) => ({ label })),
        },
      },
    });

    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24);

    await prisma.emailVerificationToken.create({
      data: { email, token, expiresAt },
    });

    await resend.emails.send({
      from: process.env.EMAIL_FROM,
      to: email,
      subject: "Confirmez votre adresse email",
      html: `
        <p>Bienvenue sur X-periences, ${pseudo} 👋</p>
        <p>Merci de vous être inscrit. Pour confirmer votre adresse email, cliquez sur le lien ci-dessous :</p>
        <p><a href="https://x-periences.fr/verify?token=${token}&email=${email}">Confirmer mon adresse</a></p>
        <p>Ce lien expire dans 24 heures.</p>
      `,
    });

    return NextResponse.json({ success: true, user });

  } catch (error) {
    console.error("Erreur backend :", error);
    return NextResponse.json({ success: false, message: "Erreur serveur" }, { status: 500 });
  }
}
