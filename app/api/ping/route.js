// app/api/ping/route.js
import { prisma } from "../../../lib/prisma";

export async function GET() {
  // Effectue une toute petite requête (très rapide)
  await prisma.utilisateur.findFirst({ select: { id: true } });
  return new Response("pong");
}
