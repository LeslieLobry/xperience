import { S3Client, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const BUCKET = process.env.AWS_S3_BUCKET;

export const s3 = new S3Client({
  region: process.env.AWS_REGION,
  endpoint: `https://s3.${process.env.AWS_REGION}.amazonaws.com`,
  forcePathStyle: false,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Générer une presigned URL (lecture, clé S3 en paramètre)
export async function getPresignedUrl(key, expiresIn = 600) {
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });
  return getSignedUrl(s3, command, { expiresIn });
}

// Supprimer un fichier S3 à partir de sa clé
export async function deleteFromS3(key) {
  if (!key) throw new Error("Clé S3 manquante");

  const command = new DeleteObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });

  try {
    await s3.send(command);
    console.log(`✅ Fichier supprimé de S3 : ${key}`);
  } catch (error) {
    console.error(`❌ Erreur suppression S3 [${key}]`, error);
    throw error;
  }
}
