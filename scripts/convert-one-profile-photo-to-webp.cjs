/* eslint-disable no-console */

require("dotenv").config();

const { PrismaClient } = require("@prisma/client");
const sharp = require("sharp");

const {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");

const prisma = new PrismaClient();

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const BUCKET = process.env.AWS_S3_BUCKET;

// ✅ Profil testé uniquement
const USER_ID = 1;

function isConvertibleImage(key = "") {
  return /\.(jpg|jpeg|png)$/i.test(key);
}

function toWebpKey(key) {
  return key.replace(/\.(jpg|jpeg|png)$/i, ".webp");
}

async function streamToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks);
}

async function convertOneImageToWebp(key) {
  if (!key) return null;

  if (key.endsWith(".webp")) {
    console.log("✅ Déjà en WEBP :", key);
    return key;
  }

  if (!isConvertibleImage(key)) {
    console.log("⏭️ Pas une image convertible :", key);
    return key;
  }

  console.log("📥 Téléchargement S3 :", key);

  const getObject = await s3.send(
    new GetObjectCommand({
      Bucket: BUCKET,
      Key: key,
    })
  );

  const originalBuffer = await streamToBuffer(getObject.Body);

  console.log("🛠️ Conversion en WEBP...");

  const webpBuffer = await sharp(originalBuffer)
    .rotate()
    .webp({ quality: 82 })
    .toBuffer();

  const newKey = toWebpKey(key);

  console.log("📤 Upload WEBP :", newKey);

  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: newKey,
      Body: webpBuffer,
      ContentType: "image/webp",
    })
  );

  return newKey;
}

async function deleteOldImage(key) {
  if (!key) return;

  console.log("🗑️ Suppression ancienne image S3 :", key);

  await s3.send(
    new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: key,
    })
  );

  console.log("✅ Ancienne image supprimée :", key);
}

async function main() {
  console.log("🚀 Test conversion WEBP sur un seul profil");

  if (!BUCKET) {
    throw new Error("Bucket S3 introuvable. Vérifie AWS_S3_BUCKET dans ton .env");
  }

  const user = await prisma.utilisateur.findUnique({
    where: { id: USER_ID },
    select: {
      id: true,
      pseudo: true,
      photoUrl: true,
    },
  });

  if (!user) {
    console.log("❌ Utilisateur introuvable");
    return;
  }

  console.log("👤 Profil trouvé :", user.pseudo || user.id);
  console.log("📸 Photo actuelle :", user.photoUrl);

  const oldKey = user.photoUrl;
  const newKey = await convertOneImageToWebp(oldKey);

  if (!newKey || newKey === oldKey) {
    console.log("ℹ️ Aucune modification nécessaire.");
    return;
  }

  await prisma.utilisateur.update({
    where: { id: user.id },
    data: {
      photoUrl: newKey,
    },
  });

  console.log("✅ Profil mis à jour");

  await deleteOldImage(oldKey);

  console.log("Ancienne photo :", oldKey);
  console.log("Nouvelle photo :", newKey);
  console.log("🎉 Terminé pour le profil ID :", USER_ID);
}

main()
  .catch((err) => {
    console.error("❌ Erreur :", err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });