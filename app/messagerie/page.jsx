import { cookies } from "next/headers";
import { getUserFromToken } from "../../lib/auth";
import MessagerieClient from "../../components/MessagerieClient/MessagerieClient";
import { redirect } from "next/navigation";
import "../../app/messagerie/messagerie.css";

export default async function MessageriePage() {
  const cookieStore = cookies();
  const user = await getUserFromToken(cookieStore);

  if (!user) {
    return redirect("/connexion");
  }

  return <MessagerieClient user={user} />;
}
 