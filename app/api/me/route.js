import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();
const secret = process.env.JWT_SECRET;

export async function GET(req) {
  const token = req.cookies.get("token")?.value;

  if (!token) {
    return Response.json({ success: false, message: "Non authentifié." }, { status: 401 });
  }

  try {
    const decoded = jwt.verify(token, secret);

    const user = await prisma.utilisateur.findUnique({
      where: { id: decoded.id },
      include: { recherches: true },
    });

    if (!user) {
      return Response.json({ success: false, message: "Utilisateur introuvable." }, { status: 404 });
    }

    return Response.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        pseudo: user.pseudo,
        photoUrl: user.photoUrl,
        recherches: user.recherches,
      },
    });
  } catch (err) {
    return Response.json({ success: false, message: "Token invalide." }, { status: 403 });
  }
}
