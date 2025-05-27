import Link from "next/link";

export default function AccesRefusePage() {
  return (
    <div className="refuse-container">
      <h1>⛔ Accès refusé</h1>
      <p>Cette page est réservée aux administrateurs.</p>
      <Link href="/" className="refuse-home">← Retour à l&apos;accueil</Link>
    </div>
  );
}
