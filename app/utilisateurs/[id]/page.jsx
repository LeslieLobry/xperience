import { PrismaClient } from "@prisma/client";
import { getUserFromToken } from "../../../lib/auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const prisma = new PrismaClient();

export default async function Page({ params }) {
  const cookieStore = cookies();
  const currentUser = getUserFromToken(cookieStore);

  if (!currentUser) {
    return redirect("/connexion");
  }

  const userId = params.id;

  if (currentUser.id !== userId) {
    return redirect("/connexion");
  }

  const user = await prisma.utilisateur.findUnique({
    where: { id: userId },
    include: { recherches: true },
  });

  if (!user) return <p>Utilisateur introuvable.</p>;

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Bienvenue, {user.pseudo}</h1>
      <p>Email : {user.email}</p>
      <p>Recherches : {user.recherches.map(r => r.label).join(", ")}</p>
    </div>
  );
}
