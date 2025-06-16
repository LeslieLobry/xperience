import { IncomingForm } from "formidable";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { Readable } from "stream";
import { resend } from "../../../lib/resend";
import { v4 as uuidv4 } from "uuid";

export const config = {
  api: { bodyParser: false },
};

const prisma = new PrismaClient();
const MAX_FILE_SIZE = 2 * 1024 * 1024;
const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

function streamFromRequest(request) {
  const reader = request.body.getReader();
  return new Readable({
    async read() {
      const { done, value } = await reader.read();
      if (done) return this.push(null);
      this.push(value);
    },
  });
}

export async function POST(req) {
  const nodeReq = Object.assign(streamFromRequest(req), {
    headers: Object.fromEntries(req.headers),
    method: req.method,
    url: req.url,
  });

  return new Promise((resolve) => {
    const form = new IncomingForm({
      maxFileSize: MAX_FILE_SIZE,
      keepExtensions: true,
      multiples: true,
    });

    form.parse(nodeReq, async (err, fields, files) => {
      if (err) {
        console.error("Erreur formidable :", err);
        return resolve(new Response(JSON.stringify({ success: false, message: "Erreur parsing" }), { status: 500 }));
      }

      try {
        const getField = (v) => Array.isArray(v) ? v[0] : v;

        const nom = getField(fields.nom);
        const prenom = getField(fields.prenom);
        const pseudo = getField(fields.pseudo);
        const email = getField(fields.email);
        const password = getField(fields.password);
        const type = getField(fields.type);
        const orientation = getField(fields.orientation);
        const age = parseInt(getField(fields.age));
        const localisation = getField(fields.localisation);
        const consent = getField(fields.consent) === "true";
        const consentCGUDate = consent ? new Date() : null;
        const captchaToken = getField(fields["captchaToken"]);

        if (!captchaToken) {
          return resolve(new Response(JSON.stringify({ success: false, message: "Captcha manquant" }), { status: 400 }));
        }

        const captchaSecret = process.env.RECAPTCHA_SECRET_KEY;
        const captchaRes = await fetch("https://www.google.com/recaptcha/api/siteverify", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: `secret=${captchaSecret}&response=${captchaToken}`,
        });
        const captchaData = await captchaRes.json();

        if (!captchaData.success) {
          return resolve(new Response(JSON.stringify({ success: false, message: "Échec de la vérification reCAPTCHA" }), { status: 400 }));
        }

        const exists = await prisma.utilisateur.findFirst({
          where: { OR: [{ email }, { pseudo }] },
        });

        if (exists) {
          return resolve(new Response(JSON.stringify({ success: false, message: "Email ou pseudo déjà utilisé" }), { status: 400 }));
        }

        const recherche = fields["recherche[]"]
          ? Array.isArray(fields["recherche[]"]) ? fields["recherche[]"] : [fields["recherche[]"]]
          : [];

        const hashedPassword = await bcrypt.hash(password, 10);

        // Désactivation de l'upload fichier
        const photoPath = null; // Tu peux mettre "/default.jpg" si besoin

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

        return resolve(new Response(JSON.stringify({ success: true, user }), { status: 200 }));

      } catch (error) {
        console.error("Erreur backend :", error);
        return resolve(new Response(JSON.stringify({ success: false, message: "Erreur serveur" }), { status: 500 }));
      }
    });
  });
}
