import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcryptjs";
import { prisma } from "../../../lib/prisma";
import { resend } from "../../../lib/resend";
import { s3 } from "../../../lib/s3";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { IncomingForm } from "formidable";
import { Readable } from "stream";
import fs from "fs/promises";

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
    const form = new IncomingForm({ keepExtensions: true, multiples: false });

    form.parse(nodeReq, async (err, fields, files) => {
      if (err) {
        console.error("❌ Erreur parsing formulaire :", err);
        return resolve(NextResponse.json({ success: false, message: "Erreur parsing" }, { status: 500 }));
      }

      try {
        console.log("📩 Champs reçus :", fields);
        console.log("🖼️ Fichiers reçus :", files);

        const nom = String(fields.nom || "");
        const prenom = String(fields.prenom || "");
        const pseudo = String(fields.pseudo || "");
        const email = String(fields.email || "");
        const password = String(fields.password || "");
        const type = String(fields.type || "");
        const orientation = String(fields.orientation || "");
        const age = parseInt(fields.age || "0", 10);
        const localisation = String(fields.localisation || "");
        const latitude = parseFloat(fields.latitude || "");
        const longitude = parseFloat(fields.longitude || "");
        const consent = fields.consent === "true";
        const captchaToken = String(fields.captchaToken || "");

        const recherche = fields["recherche[]"]
          ? Array.isArray(fields["recherche[]"])
            ? fields["recherche[]"]
            : [fields["recherche[]"]]
          : [];

        if (!captchaToken) {
          console.warn("⚠️ Captcha manquant");
          return resolve(NextResponse.json({ success: false, message: "Captcha manquant" }, { status: 400 }));
        }

        console.log("🔐 Vérification reCAPTCHA...");
        const captchaRes = await fetch("https://www.google.com/recaptcha/api/siteverify", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: `secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${captchaToken}`,
        });

        const captchaData = await captchaRes.json();
        console.log("✅ Résultat reCAPTCHA :", captchaData);
        if (!captchaData.success) {
          return resolve(NextResponse.json({ success: false, message: "Échec reCAPTCHA" }, { status: 400 }));
        }

        console.log("🔍 Vérification utilisateur existant...");
        const exists = await prisma.utilisateur.findFirst({
          where: { OR: [{ email }, { pseudo }] },
        });

        if (exists) {
          console.warn("❌ Utilisateur déjà existant :", { email, pseudo });
          return resolve(NextResponse.json({ success: false, message: "Email ou pseudo déjà utilisé" }, { status: 400 }));
        }

        console.log("🔒 Hash du mot de passe...");
        const hashedPassword = await bcrypt.hash(password, 10);

        let photoUrl = null;
        const photoFile = Array.isArray(files.photo) ? files.photo[0] : files.photo;

        if (photoFile && photoFile.filepath) {
          try {
            console.log("📂 Lecture du fichier image...");
            const buffer = await fs.readFile(photoFile.filepath);

            console.log("🔎 Modération de la photo avec Sightengine...");
            const moderationForm = new FormData();
            moderationForm.append("media", new Blob([buffer], { type: photoFile.mimetype }), photoFile.originalFilename);
            moderationForm.append("models", "face-attributes");
            moderationForm.append("api_user", process.env.SIGHTENGINE_USER);
            moderationForm.append("api_secret", process.env.SIGHTENGINE_SECRET);

            const moderationRes = await fetch("https://api.sightengine.com/1.0/check.json", {
              method: "POST",
              body: moderationForm,
            });

            const moderationData = await moderationRes.json();
            console.log("📄 Résultat Sightengine :", moderationData);

            if (moderationData?.faces?.length) {
              const hasMinor = moderationData.faces.some((f) => f.attributes?.minor > 0.8);
              if (hasMinor) {
                console.warn("🚫 Visage potentiellement mineur détecté");
                return resolve(
                  NextResponse.json(
                    { success: false, message: "Photo refusée : une personne semble avoir moins de 18 ans." },
                    { status: 400 }
                  )
                );
              }
            }

            const filename = `photo_${Date.now()}_${photoFile.originalFilename}`;
            const bucket = process.env.AWS_S3_BUCKET;

            console.log("☁️ Envoi vers S3 :", filename);
            await s3.send(
              new PutObjectCommand({
                Bucket: bucket,
                Key: filename,
                Body: Buffer.from(buffer),
                ContentType: photoFile.mimetype,
              })
            );

            photoUrl = filename;
            console.log("✅ Upload S3 réussi :", photoUrl);
          } catch (uploadErr) {
            console.error("💥 Erreur upload photo :", uploadErr);
            return resolve(NextResponse.json({ success: false, message: "Erreur upload photo" }, { status: 500 }));
          }
        } else {
          console.warn("⚠️ Aucun fichier photo reçu");
        }

        console.log("👤 Création de l'utilisateur...");
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
            latitude,
            longitude,
            consent,
            consentCGU: consent,
            consentCGUDate: new Date(),
            photoUrl,
            verificationDeadline: new Date(Date.now() + 48 * 60 * 60 * 1000),
            recherches: {
              create: recherche.map((label) => ({ label })),
            },
          },
        });

        const token = uuidv4();
        console.log("✉️ Envoi de l'email de confirmation...");
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

        console.log("✅ Utilisateur créé avec succès :", newUser.id);
        return resolve(NextResponse.json({ success: true, user: newUser, photoUrl }));
      } catch (e) {
        console.error("💥 ERREUR SERVEUR GÉNÉRALE :", e);
        return resolve(
          NextResponse.json({ success: false, message: "Erreur serveur" }, { status: 500 })
        );
      }
    });
  });
}
