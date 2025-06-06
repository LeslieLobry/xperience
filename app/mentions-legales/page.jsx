export const metadata = {
  title: "Mentions légales - Xperiences",
  description: "Informations légales du site échangiste Xperiences.",
};

export default function MentionsLegalesPage() {
  return (
    <main style={{ maxWidth: "800px", margin: "0 auto", padding: "2rem", color:"white"}}>
      <h1>📄 Mentions légales</h1>

      <h2>Éditeur du site</h2>
      <p>
        <strong>Xperiences</strong><br />
        [Raison sociale ou nom du responsable]<br />
        [Adresse postale]<br />
        Email : <a href="mailto:contact@xperiences.fr">contact@xperiences.fr</a>
      </p>

      <h2>Hébergement</h2>
      <p>
        [Hébergeur choisi, ex : Vercel / OVH / Scaleway]<br />
        [Adresse de l'hébergeur]
      </p>

      <h2>Propriété intellectuelle</h2>
      <p>
        L’ensemble du contenu présent sur le site Xperiences (textes, images, code, logo…) est protégé par les lois en vigueur sur la propriété intellectuelle.
      </p>

      <h2>Limitation de responsabilité</h2>
      <p>
        L’éditeur ne peut être tenu responsable du contenu partagé par les utilisateurs, ni des dommages éventuels liés à l’utilisation du site.
      </p>

      <h2>Droit applicable</h2>
      <p>
        Les présentes mentions sont soumises au droit français.
      </p>
    </main>
  );
}
