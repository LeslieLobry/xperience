import { prisma } from "../../../../lib/prisma";
import { getUserFromToken } from "../../../../lib/auth";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});
const BUCKET = process.env.AWS_S3_BUCKET;

export async function DELETE(req, { params }) {
  const user = await getUserFromToken();
  if (!user) {
    return new Response("Non autorisé", { status: 401 });
  }

  const messageId = parseInt(params.id);
  const message = await prisma.message.findUnique({
    where: { id: messageId },
  });

  if (!message || message.auteurId !== user.id) {
    return new Response("Interdit", { status: 403 });
  }

  // 1️⃣ Supprime image/audio sur S3 s’il y en a
  const s3Keys = [];
  if (message.imageUrl && !message.imageUrl.startsWith("http")) s3Keys.push(message.imageUrl);
  if (message.audioUrl && !message.audioUrl.startsWith("http")) s3Keys.push(message.audioUrl);

  for (const key of s3Keys) {
    try {
      await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
    } catch (e) {
      // Si erreur de suppression S3, on log mais on continue la suppression du message
      console.warn("Erreur suppression S3 :", key, e);
    }
  }

  await prisma.message.delete({ where: { id: messageId } });

  return new Response("Message supprimé", { status: 200 });
}
