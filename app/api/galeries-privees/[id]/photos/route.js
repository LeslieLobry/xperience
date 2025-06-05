import { cookies } from "next/headers";
import { prisma } from '../../../../../lib/prisma';
import bcrypt from 'bcryptjs';

// GET : accès aux photos avec cookie ou code
export async function GET(request, { params }) {
  const galerieId = Number(params.id);
  const cookieStore = await cookies(); // <- AWAIT ici
  const cookieAcces = cookieStore.get(`acces_galerie_${params.id}`);

  let codeOK = false;
  if (cookieAcces?.value === "ok") {
    codeOK = true;
  } else {
    // Vérifie le code passé en query si pas de cookie
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    if (!code)
      return Response.json({ error: 'Code requis' }, { status: 400 });

    const galerie = await prisma.galeriePrivee.findUnique({ where: { id: galerieId } });
    if (!galerie) return Response.json({ error: 'Galerie introuvable' }, { status: 404 });
    const ok = await bcrypt.compare(code, galerie.codeAcces);
    if (!ok) return Response.json({ error: 'Code invalide' }, { status: 403 });

    // On SET le cookie pour 1 jour (86400s)
    cookies().set(`acces_galerie_${params.id}`, "ok", { httpOnly: true, maxAge: 86400, path: "/" });
    codeOK = true;
  }

  // On retourne les photos si codeOK
  if (!codeOK) return Response.json({ error: "Accès refusé" }, { status: 403 });

  const galerie = await prisma.galeriePrivee.findUnique({
    where: { id: galerieId },
    include: { photos: true }
  });
  if (!galerie) return Response.json({ error: 'Galerie introuvable' }, { status: 404 });

  return Response.json({ photos: galerie.photos }, { status: 200 });
}

// POST : ajout photo (uniquement pour le propriétaire)
export async function POST(request, { params }) {
  const galerieId = Number(params.id);
  const { url, utilisateurId } = await request.json();

  if (!galerieId || !url || !utilisateurId)
    return Response.json({ error: 'Champs requis' }, { status: 400 });

  const galerie = await prisma.galeriePrivee.findUnique({ where: { id: galerieId } });
  if (!galerie) return Response.json({ error: "Galerie introuvable" }, { status: 404 });

  if (galerie.utilisateurId !== Number(utilisateurId)) {
    return Response.json({ error: "Non autorisé" }, { status: 403 });
  }

  const photo = await prisma.photo.create({
    data: {
      url,
      galeriePriveeId: galerieId,
      utilisateurId: Number(utilisateurId)
    }
  });

  return Response.json(photo, { status: 201 });
}
