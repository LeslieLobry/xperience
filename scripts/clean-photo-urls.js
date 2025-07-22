// scripts/clean-photo-urls.js
import { prisma } from "../lib/prisma";

const BASE_URL = "https://ton-bucket.s3.eu-west-3.amazonaws.com/";

async function cleanUrls() {
  const photos = await prisma.photo.findMany();
  for (const photo of photos) {
    if (photo.url.startsWith(BASE_URL)) {
      const s3key = photo.url.replace(BASE_URL, "");
      await prisma.photo.update({
        where: { id: photo.id },
        data: { url: s3key }
      });
      console.log(`Photo ${photo.id} nettoyée !`);
    }
  }
  console.log("✔️ Migration terminée");
}

cleanUrls().then(() => process.exit());
