import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const utilisateurs = await prisma.utilisateur.findMany();
  console.log(utilisateurs);
}

main()
  .catch((e) => {
    console.error("❌ Erreur Prisma :", e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
