import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getUserFromToken } from "../../lib/auth";
import VerifIdentiteObligatoirePage from "../../components/VerifIdentiteObligatoirePage/VerifIdentiteObligatoirePage";

export default async function Page() {
  const cookieStore = cookies();
  const user = await getUserFromToken(cookieStore);

  // 🔒 Redirection si non connecté
  if (!user) return redirect("/connexion");

  return <VerifIdentiteObligatoirePage />;
}
