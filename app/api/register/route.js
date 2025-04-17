import { IncomingForm } from "formidable";
import { writeFile } from "fs/promises";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

export const config = {
  api: {
    bodyParser: false,
  },
};

const prisma = new PrismaClient();

export async function POST(req) {
  return new Promise((resolve, reject) => {
    const form = new IncomingForm({ keepExtensions: true, multiples: true });

    form.parse(req, async (err, fields, files) => {
      if (err) {
        console.error("Erreur formidable :", err);
        return resolve(
          new Response(JSON.stringify({ success: false, message: "Erreur parsing" }), { status: 500 })
        );
      }

      try {
        const {
          nom,
          prenom,
          pseudo,
          email,
          password,
          type,
          orientation,
          age,
          consent,
          localisation,
        } = fields;

        // Gestion des champs multiples (ex: recherche[])
        const recherche = fields["recherche[]"]
          ? Array.isArray(fields["recherche[]"])
            ? fields["recherche[]"]
            : [fields["recherche[]"]]
          : [];

        // Hachage du mot de passe
        const hashedPassword = await bcrypt.hash(password, 10);

        // Gestion de la photo
        let photoPath = null;
        if (files.photo && files.photo[0]) {
          const file = files.photo[0];
          const buffer = await file.toBuffer();
          const savePath = `./public/uploads/${file.originalFilename}`;
          await writeFile(savePath, buffer);
          photoPath = `/uploads/${file.originalFilename}`;
        }

        const user = await prisma.utilisateur.create({
          data: {
            nom,
            prenom,
            pseudo,
            email,
            password: hashedPassword,
            type,
            orientation,
            age: parseInt(age),
            consent: consent === "true" || consent === true,
            localisation,
            photoUrl: photoPath,
            recherches: {
              create: recherche.map((label) => ({ label })),
            },
          },
        });
        
        return resolve(
          new Response(JSON.stringify({ success: true, user }), { status: 200 })
        );
      } catch (error) {
        console.error("Erreur backend :", error);
        return resolve(
          new Response(JSON.stringify({ success: false, message: "Erreur serveur" }), { status: 500 })
        );
      }
    });
  });
}
