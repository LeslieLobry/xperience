// scripts/create-users.js
import { prisma } from '../lib/prisma.js';
import bcrypt from 'bcryptjs';

async function createUsers() {
  const users = [
    {
      nom: 'Dupont',
      prenom: 'Jean',
      pseudo: 'jeanou',
      email: 'jean@example.com',
      password: 'motdepasse123',
      age: 35,
    },
    {
      nom: 'Martin',
      prenom: 'Claire',
      pseudo: 'clairette',
      email: 'claire@example.com',
      password: 'monmotdepasse456',
      age: 29,
    }
  ];

  for (const user of users) {
    const hash = await bcrypt.hash(user.password, 10);
    const created = await prisma.utilisateur.create({
      data: {
        nom: user.nom,
        prenom: user.prenom,
        pseudo: user.pseudo,
        email: user.email,
        password: hash,
        type: 'Célibataire',
        orientation: 'Hétéro',
        age: user.age,
        consent: true,
        localisation: 'Paris',
      },
    });

    console.log(`✅ Utilisateur ${created.pseudo} créé`);
  }

  await prisma.$disconnect();
}

createUsers().catch((err) => {
  console.error(err);
  prisma.$disconnect();
});
