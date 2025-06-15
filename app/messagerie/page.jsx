import dynamic from 'next/dynamic';
import { cookies } from "next/headers";
import { getUserFromToken } from "../../lib/auth";
import MessagerieClient from '../../components/MessegerieClient.jsx/MessegerieClient';
import "../../app/messagerie/messagerie.css"

export default async function MessageriePage() {
  const cookieStore = cookies();
  const user = await getUserFromToken(cookieStore);

  if (!user) {
    return <p>Connecte-toi pour accéder à la messagerie.</p>;
  }

  return <MessagerieClient user={user} />;
}
