import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();
const secret = process.env.JWT_SECRET;

export async function POST(req) {
  const { email, password } = await req.json();

  if (!email || !password) {
    return Response.json({ success: false, message: "Champs requis manquants." }, { status: 400 });
  }

  const user = await prisma.utilisateur.findUnique({ where: { email } });

  if (!user) {
    return Response.json({ success: false, message: "Utilisateur non trouvé." }, { status: 404 });
  }

  if (!user.emailVerified) {
    return Response.json({ success: false, message: "Adresse email non confirmée." }, { status: 403 });
  }

  const passwordMatch = await bcrypt.compare(password, user.password);

  if (!passwordMatch) {
    return Response.json({ success: false, message: "Mot de passe incorrect." }, { status: 401 });
  }

  // ✅ Mettre à jour la dernière connexion
  await prisma.utilisateur.update({
    where: { id: user.id },
    data: { lastLogin: new Date() }
  });

  // ✅ Générer un JWT
  const token = jwt.sign(
    {
      id: user.id,
      email: user.email,
      pseudo: user.pseudo,
    },
    secret,
    { expiresIn: "7d" }
  );

  // ✅ Retourner le token en cookie HttpOnly
  return new Response(JSON.stringify({ success: true, user: { id: user.id, pseudo: user.pseudo } }), {
    status: 200,
    headers: {
      "Set-Cookie": `token=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=604800`,
      "Content-Type": "application/json",
    },
  });
}
