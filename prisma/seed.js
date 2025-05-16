import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // 🔁 Supprimer tout proprement
  await prisma.avis.deleteMany();
  await prisma.utilisateur.deleteMany();

  // 👥 Créer 3 utilisateurs
  const alice = await prisma.utilisateur.create({
    data: {
      nom: "Dupont",
      prenom: "Alice",
      pseudo: "alice01",
      email: "alice@test.com",
      password: "test123",
      type: "couple",
      orientation: "bi",
      age: 30,
      consent: true,
      localisation: "Lille",
      role: "USER",
    },
  });

  const bob = await prisma.utilisateur.create({
    data: {
      nom: "Martin",
      prenom: "Bob",
      pseudo: "bob02",
      email: "bob@test.com",
      password: "test123",
      type: "femme",
      orientation: "hétéro",
      age: 28,
      consent: true,
      localisation: "Roubaix",
      role: "USER",
    },
  });

  const chloe = await prisma.utilisateur.create({
    data: {
      nom: "Durand",
      prenom: "Chloé",
      pseudo: "chloe03",
      email: "chloe@test.com",
      password: "test123",
      type: "homme",
      orientation: "bi",
      age: 35,
      consent: true,
      localisation: "Tourcoing",
      role: "USER",
    },
  });

  // ✍️ Créer des avis
  await prisma.avis.create({
    data: {
      auteurId: alice.id,
      cibleId: bob.id,
      commentaire: "Bob est super respectueux, échange fluide !",
    },
  });

  await prisma.avis.create({
    data: {
      auteurId: bob.id,
      cibleId: chloe.id,
      commentaire: "Rencontre agréable, bonne communication.",
    },
  });

  console.log("✔ Utilisateurs et avis générés avec succès !");
}

main()
  .catch((e) => {
    console.error("❌ Erreur lors du seed :", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
