import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';

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

/**
 * Supprime un fichier S3 à partir de son nom (clé).
 * @param {string} key - Exemple : "photo_123456789.webp"
 */
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
