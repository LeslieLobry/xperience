// scripts/cleanAllPrivateGalleries.js
import { prisma } from '../lib/prisma.js';

async function cleanAllPrivateGalleries() {
  // Supprimer toutes les photos liées à une galerie privée
  const deletedPhotos = await prisma.photo.deleteMany({
    where: {
      NOT: {
        galeriePriveeId: null,
      },
    },
  });
  console.log(`🗑️ Supprimé ${deletedPhotos.count} photos privées`);

  // Supprimer toutes les galeries privées
  const deletedGalleries = await prisma.galeriePrivee.deleteMany({});
  console.log(`🗑️ Supprimé ${deletedGalleries.count} galeries privées`);

  console.log("✅ Base nettoyée, prête pour la migration.");
}

cleanAllPrivateGalleries()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
