import { NextResponse } from 'next/server';
import { getUserFromToken } from '../../../lib/auth';
import { prisma } from '../../../lib/prisma';

export async function POST(req) {
  // ✅ utilise cookies() par défaut dans getUserFromToken()
  const user = await getUserFromToken();

  if (!user || !user.id) {
    return NextResponse.json({ message: 'Non autorisé' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { description } = body;

    if (typeof description !== 'string') {
      return NextResponse.json({ message: 'Description invalide' }, { status: 400 });
    }

    await prisma.utilisateur.update({
      where: { id: user.id },
      data: { description },
    });

    return NextResponse.json({ message: 'Description mise à jour' });
  } catch (error) {
    console.error('❌ Erreur update description :', error);
    return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 });
  }
}