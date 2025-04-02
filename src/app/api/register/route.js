import { IncomingForm } from "formidable";
import { writeFile } from "fs/promises";

// important : désactive le bodyParser
export const config = {
  api: {
    bodyParser: false,
  },
};

export async function POST(req) {
  return new Promise((resolve, reject) => {
    const form = new IncomingForm({ keepExtensions: true });

    form.parse(req, async (err, fields, files) => {
      if (err) {
        console.error("Erreur formidable :", err);
        return resolve(new Response(JSON.stringify({ success: false, message: "Erreur parsing" }), { status: 500 }));
      }

      console.log("Champs reçus :", fields);
      console.log("Fichier reçu :", files.photo);

      // Optionnel : enregistrer temporairement l’image
      if (files.photo && files.photo[0]) {
        const file = files.photo[0];
        const data = await file.toBuffer(); // besoin de Node.js >=18

        await writeFile(`./public/uploads/${file.originalFilename}`, data);
        console.log("Image sauvegardée !");
      }

      return resolve(new Response(JSON.stringify({ success: true, message: "Formulaire reçu" }), { status: 200 }));
    });
  });
}
