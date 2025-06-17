import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcryptjs";
import { prisma } from "../../../lib/prisma";
import { resend } from "../../../lib/resend";
import { s3 } from "../../../lib/s3";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { IncomingForm } from "formidable";
import { Readable } from "stream";

export const config = {
  api: { bodyParser: false },
};

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
    const form = new IncomingForm({ keepExtensions: true });

    form.parse(nodeReq, async (err, fields, files) => {
      if (err) {
        console.error("❌ Erreur parsing fichier:", err);
        return resolve(
          NextResponse.json({ success: false, message: "Erreur parsing" }, { status: 500 })
        );
      }

      try {
        console.log("📥 Champs reçus :", fields);
        console.log("📷 Fichiers reçus :", files);

        // ⚠️ Casts sécurisés
        const nom = String(fields.nom || "");
        const prenom = String(fields.prenom || "");
        const pseudo = String(fields.pseudo || "");
        const email = String(fields.email || "");
        const password = String(fields.password || "");
        const type = String(fields.type || "");
        const orientation = String(fields.orientation || "");
        const age = parseInt(fields.age || "0", 10);
        const localisation = String(fields.localisation || "");
        const consent = fields.consent === "true";
        const captchaToken = String(fields.captchaToken || "");

        const recherche = fields["recherche[]"]
          ? Array.isArray(fields["recherche[]"])
            ? fields["recherche[]"]
            : [fields["recherche[]"]]
          : [];

        console.log("🧪 Vérification des types email/pseudo :", { email, pseudo });
        if (!captchaToken) {
          return resolve(NextResponse.json({ success: false, message: "Captcha manquant" }, { status: 400 }));
        }

        // ✅ reCAPTCHA
        const captchaRes = await fetch("https://www.google.com/recaptcha/api/siteverify", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: `secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${captchaToken}`,
        });

        const captchaData = await captchaRes.json();
        if (!captchaData.success) {
          console.warn("🛑 reCAPTCHA échoué :", captchaData);
          return resolve(NextResponse.json({ success: false, message: "Échec reCAPTCHA" }, { status: 400 }));
        }

        const exists = await prisma.utilisateur.findFirst({
          where: { OR: [{ email }, { pseudo }] },
        });

        if (exists) {
          console.warn("🔁 Utilisateur déjà existant :", exists.email, exists.pseudo);
          return resolve(NextResponse.json({ success: false, message: "Email ou pseudo déjà utilisé" }, { status: 400 }));
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // ✅ Upload vers S3
        let photoUrl = null;
        const photo = files.photo;

        if (photo && photo.filepath) {
          console.log("⬆️ Upload photo :", photo.originalFilename);
          const buffer = await Bun.file(photo.filepath).arrayBuffer();
          const filename = `photo_${Date.now()}_${photo.originalFilename}`;
          const bucket = process.env.AWS_S3_BUCKET;

          await s3.send(new PutObjectCommand({
            Bucket: bucket,
            Key: filename,
            Body: Buffer.from(buffer),
            ContentType: photo.mimetype,
          }));

          photoUrl = `https://${bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${filename}`;
        }

        // ✅ Création utilisateur
        const newUser = await prisma.utilisateur.create({
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
            consentCGUDate: new Date(),
            photoUrl,
            verificationIdentite: false,
            verificationDeadline: new Date(Date.now() + 48 * 60 * 60 * 1000),
            recherches: {
              create: recherche.map((label) => ({ label })),
            },
          },
        });

        const token = uuidv4();
        await prisma.emailVerificationToken.create({
          data: {
            email,
            token,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          },
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

        console.log("✅ Utilisateur inscrit :", newUser.id);
        return resolve(NextResponse.json({ success: true, user: newUser }));
      } catch (e) {
        console.error("❌ Erreur d'inscription :", e);
        console.error("🧾 Données utilisées :", {
          nom,
          prenom,
          pseudo,
          email,
          type,
          orientation,
          age,
          localisation,
          consent,
          photo: files.photo?.originalFilename,
          recherches: recherche,
        });
        return resolve(
          NextResponse.json({ success: false, message: "Erreur serveur" }, { status: 500 })
        );
      }
    });
  });
}
