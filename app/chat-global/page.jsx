import { cookies } from "next/headers";
import { getUserFromToken } from "../../lib/auth";
import { PrismaClient } from "@prisma/client";
import ChatGlobal from "../../components/ChatGlobal/ChatGlobal"; 

const prisma = new PrismaClient();

export default async function ChatGlobalPage() {
  const cookieStore = cookies();
  const user = await getUserFromToken(cookieStore);

  if (!user) {
    return <div style={{ padding: 20 }}>🚫 Vous devez être connecté pour accéder au chat global.</div>;
  }

  const connectedUser = await prisma.utilisateur.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      pseudo: true,
      photoUrl: true,
    },
  });

  if (!connectedUser) {
    return <div style={{ padding: 20 }}>Utilisateur introuvable.</div>;
  }

  return (
    <div style={{ padding: "2rem", maxWidth: 800, margin: "0 auto" }}>
      <h2 style={{ color: "#e0c084", marginBottom: "1rem" }}>
        💬 Chat Global - Bienvenue {connectedUser.pseudo}
      </h2>
      <ChatGlobal utilisateur={connectedUser} />
    </div>
  );
}
