import { prisma } from '../../../lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(req) {
  const { nom, codeAcces, utilisateurId } = await req.json();
  if (!nom || !codeAcces || !utilisateurId)
    return Response.json({ error: 'Champs requis' }, { status: 400 });

  const hash = await bcrypt.hash(codeAcces, 10);

  const galerie = await prisma.galeriePrivee.create({
    data: { nom, codeAcces: hash, utilisateurId }
  });

  return Response.json({ id: galerie.id }, { status: 201 });
}
