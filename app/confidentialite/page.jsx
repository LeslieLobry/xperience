export const metadata = {
  title: "Politique de confidentialité - Xperiences",
  description: "Données personnelles et confidentialité sur le site Xperiences.",
};

export default function ConfidentialitePage() {
  return (
    <main style={{ maxWidth: "800px", margin: "0 auto", padding: "2rem", color: "white" }}>
      <h1>🔒 Politique de confidentialité</h1>

      <p>
        La protection de vos données personnelles est essentielle sur <strong>Xperiences</strong>. Ce document explique comment nous collectons, utilisons et protégeons vos informations conformément au <strong>Règlement Général sur la Protection des Données (RGPD)</strong>.
      </p>

      <h2>1. Responsable du traitement</h2>
      <p>
        Le responsable du traitement des données est :  
        <br />
        <strong>Xperiences</strong> – contact@x-periences.fr
      </p>

      <h2>2. Données collectées</h2>
      <p>Nous collectons uniquement les données strictement nécessaires au fonctionnement du site&nbsp;:</p>
      <ul>
        <li>Informations de profil : pseudo, email, âge, sexe, orientation, préférences</li>
        <li>Contenus fournis : photos, messages, avis, interactions</li>
        <li>Données de navigation : adresse IP, type d&rsquo;appareil, pages visitées</li>
        <li>Données de sécurité : date d&rsquo;inscription, connexions, vérification email</li>
      </ul>

      <h2>3. Finalité de la collecte</h2>
      <p>Les données sont utilisées uniquement pour&nbsp;:</p>
      <ul>
        <li>Permettre l&rsquo;accès aux fonctionnalités du site</li>
        <li>Sécuriser les échanges et prévenir les abus</li>
        <li>Personnaliser l&rsquo;expérience utilisateur</li>
        <li>Respecter les obligations légales</li>
      </ul>

      <h2>4. Partage des données</h2>
      <p>
        Aucune donnée n&rsquo;est vendue ou cédée à des tiers. Les seules personnes pouvant accéder à vos informations sont les administrateurs du site à des fins de modération ou de support.
      </p>

      <h2>5. Durée de conservation</h2>
      <p>
        Les données sont conservées&nbsp;:</p>
        <ul>
          <li>Tant que votre compte est actif</li>
          <li>Ou jusqu&rsquo;à votre demande de suppression</li>
        </ul>

      <h2>6. Vos droits</h2>
      <p>
        Vous disposez à tout moment des droits suivants&nbsp;:
      </p>
      <ul>
        <li>Droit d&rsquo;accès à vos données</li>
        <li>Droit de rectification ou de suppression</li>
        <li>Droit à la portabilité</li>
        <li>Droit d&rsquo;opposition ou de limitation du traitement</li>
      </ul>
      <p>
        Pour exercer vos droits, écrivez à : <a href="mailto:contact@x-periences.fr">contact@x-periences.fr</a>
      </p>

      <h2>7. Sécurité</h2>
      <p>
        Le site met en place des mesures techniques (HTTPS, cryptage, contrôle d&rsquo;accès) et organisationnelles (modération, permissions) pour protéger vos données.
      </p>

      <h2>8. Cookies</h2>
      <p>
        Pour en savoir plus sur notre utilisation des cookies, veuillez consulter la <a href="/cookies">page dédiée Cookies &amp; vie privée</a>.
      </p>

      <h2>9. Modifications</h2>
      <p>
        Cette politique peut être modifiée pour rester conforme à la législation. Dernière mise à jour : <strong>6 juin 2025</strong>.
      </p>
    </main>
  );
}
