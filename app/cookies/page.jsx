export const metadata = {
  title: "Cookies et vie privée - Xperiences",
  description: "Politique de cookies et confidentialité du site échangiste Xperiences.",
};

export default function CookiesPage() {
  return (
    <main style={{ maxWidth: "800px", margin: "0 auto", padding: "2rem", color: "white" }}>
      <h1>🍪 Cookies &amp; Vie privée</h1>

      <p>
        Chez <strong>Xperiences</strong>, la discrétion, la confidentialité et la protection de vos données sont une priorité absolue.
      </p>

      <h2>1. Utilisation des cookies</h2>
      <p>Nous utilisons uniquement des cookies strictement nécessaires au bon fonctionnement du site, notamment pour&nbsp;:</p>
      <ul>
        <li>Garder votre session utilisateur active après connexion</li>
        <li>Sécuriser l&rsquo;accès à votre compte</li>
        <li>Gérer vos préférences (mode sombre, langue, etc.)</li>
      </ul>

      <p>
        Des cookies anonymes de mesure d&rsquo;audience (Matomo, Plausible ou Google Analytics selon configuration) peuvent être utilisés pour améliorer nos services. Vous pouvez les refuser via le bandeau dédié.
      </p>

      <h2>2. Données personnelles</h2>
      <p>
        Lors de votre inscription ou utilisation du site, nous collectons uniquement les données strictement nécessaires à votre expérience&nbsp;:
      </p>
      <ul>
        <li>Pseudonyme, âge, orientation, préférences</li>
        <li>Photos, messages échangés, activités de navigation sur Xperiences</li>
        <li>Adresse email (non publique), adresse IP à des fins de sécurité</li>
      </ul>

      <p>
        Ces données ne sont <strong>jamais revendues</strong> ni utilisées à des fins publicitaires externes.
      </p>

      <h2>3. Stockage et durée</h2>
      <p>
        Vos données sont hébergées au sein de l&rsquo;Union Européenne. Elles sont conservées tant que votre compte est actif ou jusqu&rsquo;à suppression manuelle par vous-même.
      </p>

      <h2>4. Vos droits</h2>
      <p>Conformément au RGPD, vous disposez de droits sur vos données&nbsp;:</p>
      <ul>
        <li>Accès</li>
        <li>Rectification</li>
        <li>Suppression</li>
        <li>Portabilité</li>
        <li>Opposition ou limitation</li>
      </ul>
      <p>
        Vous pouvez exercer vos droits à tout moment en nous contactant à&nbsp;:{" "}
        <a href="mailto:contact@xperiences.fr">contact@xperiences.fr</a>
      </p>

      <h2>5. Modification de la politique</h2>
      <p>
        Cette page peut être modifiée à tout moment pour rester conforme à la législation. La dernière mise à jour a eu lieu le <strong>6 juin 2025</strong>.
      </p>
    </main>
  );
}
