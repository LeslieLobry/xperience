import { IncomingForm } from "formidable";
import { mkdir, readFile, writeFile } from "fs/promises";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { Readable } from "stream";
import crypto from "crypto";
import path from "path";
import { resend } from "../../../lib/resend";
import { v4 as uuidv4 } from "uuid";

export const config = {
  api: {
    bodyParser: false,
  },
};

const prisma = new PrismaClient();

const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 2 * 1024 * 1024;

function streamFromRequest(request) {
  const reader = request.body.getReader();
  return new Readable({
    async read() {
      const { done, value } = await reader.read();
      if (done) return this.push(null);
      this.push(value);
    }
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
        const consent = getField(fields.consent) === "true" || getField(fields.consent) === true;
        const localisation = getField(fields.localisation);
        const consentCGUDate = consent ? new Date() : null;

        // Vérifie unicité
        const exists = await prisma.utilisateur.findFirst({
          where: {
            OR: [{ email }, { pseudo }],
          },
        });

        if (exists) {
          return resolve(new Response(JSON.stringify({ success: false, message: "Email ou pseudo déjà utilisé" }), { status: 400 }));
        }

        const recherche = fields["recherche[]"]
          ? Array.isArray(fields["recherche[]"]) ? fields["recherche[]"] : [fields["recherche[]"]]
          : [];

        const hashedPassword = await bcrypt.hash(password, 10);

        // Upload photo
        const uploadDir = path.join(process.cwd(), "public", "uploads");
        await mkdir(uploadDir, { recursive: true });

        let photoPath = null;
        if (files.photo && files.photo[0]) {
          const file = files.photo[0];

          if (!allowedTypes.includes(file.mimetype)) {
            return resolve(new Response(JSON.stringify({
              success: false,
              message: "Format de fichier non autorisé (JPEG, PNG, WEBP uniquement)"
            }), { status: 400 }));
          }

          if (file.size > MAX_FILE_SIZE) {
            return resolve(new Response(JSON.stringify({
              success: false,
              message: "Fichier trop volumineux (max 2 Mo)"
            }), { status: 400 }));
          }

          const buffer = await readFile(file.filepath);
          const ext = path.extname(file.originalFilename).toLowerCase();
          const uniqueName = crypto.randomBytes(16).toString("hex") + ext;
          const savePath = path.join(uploadDir, uniqueName);

          await writeFile(savePath, buffer);
          photoPath = `/uploads/${uniqueName}`;
        }

        // Création utilisateur
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
    verificationIdentite: false, // ✅ Ajouté
    verificationDeadline: new Date(Date.now() + 48 * 60 * 60 * 1000), // ✅ Ajouté (dans 48h)
    recherches: {
      create: recherche.map((label) => ({ label })),
    },
  }
});

        // Création token de vérification
        const token = uuidv4();
        const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24);

        await prisma.emailVerificationToken.create({
          data: {
            email,
            token,
            expiresAt,
          },
        });

        // Envoi de l'email
        await resend.emails.send({
          from: process.env.EMAIL_FROM,
          to: email,
          subject: "Confirmez votre adresse email",
          html: `
            <p>Bienvenue sur X-periences, ${pseudo} 👋</p>
            <p>Merci de vous être inscrit. Pour confirmer votre adresse email, cliquez sur le lien ci-dessous :</p>
            <p><a href="http://x-periences.fr/verify?token=${token}&email=${email}">Confirmer mon adresse</a></p>
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
