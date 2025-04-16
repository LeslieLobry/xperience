// server/server.js
import express from "express";
import multer from "multer";
import cors from "cors";
import path from "path";
import fs from "fs";

const app = express();
app.use(cors());

// Crée le dossier uploads si absent
const uploadDir = "uploads";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Config de multer pour stocker l'image
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + "-" + file.originalname;
    cb(null, uniqueName);
  },
});
const upload = multer({ storage });

app.post("/api/register", upload.single("photo"), (req, res) => {
  const {
    email,
    password,
    pseudo,
    type,
    orientation,
    age,
    localisation,
    consent,
  } = req.body;

  const recherche = req.body["recherche[]"];
  const photo = req.file;

  console.log("✅ Données reçues :");
  console.log({
    email,
    pseudo,
    password,
    type,
    orientation,
    age,
    localisation,
    consent,
    recherche,
    photo,
  });

  res.status(200).json({
    success: true,
    message: "Utilisateur reçu avec succès",
  });
});

app.listen(3001, () => {
  console.log("🚀 Serveur backend en écoute sur http://localhost:3001");
});
