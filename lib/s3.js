// lib/s3.js
import { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const BUCKET = process.env.AWS_S3_BUCKET;

if (!BUCKET) throw new Error("AWS_S3_BUCKET non défini");

export const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

/**
 * Presign GET (lecture) ou PUT (upload)
 */
export async function getPresignedUrl(key, { operation = "get", expiresIn = 600 } = {}) {
  if (!key) throw new Error("Clé S3 manquante");
  const cleanKey = String(key).trim().replace(/^\/+/, "");

  const command =
    operation === "put"
      ? new PutObjectCommand({ Bucket: BUCKET, Key: cleanKey, ContentType: "image/jpeg" })
      : new GetObjectCommand({ Bucket: BUCKET, Key: cleanKey });

  const url = await getSignedUrl(s3, command, { expiresIn });
  console.log(`🔑 presign ${operation} => s3://${BUCKET}/${cleanKey}`);
  return url; // URL https complète
}

export async function deleteFromS3(key) {
  if (!key) throw new Error("Clé S3 manquante");
  const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
  const cleanKey = String(key).trim().replace(/^\/+/, "");
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: cleanKey }));
}
