// app/rencontres-libertines/page.jsx
export const dynamic = "force-static";

export const metadata = {
  title: "Rencontres libertines sérieuses en France | X-périences",
  description:
    "Rencontres libertines en France dans un cadre discret et respectueux. X-périences met l’accent sur la confiance, la compatibilité, la modération et le consentement.",
  alternates: {
    canonical: "https://www.x-periences.fr/rencontres-libertines",
  },
  openGraph: {
    title: "Rencontres libertines sérieuses en France | X-périences",
    description:
      "Faites des rencontres libertines dans un cadre discret, sécurisé et orienté consentement. Profils de qualité, échanges plus clairs, communauté respectueuse.",
    url: "https://www.x-periences.fr/rencontres-libertines",
    siteName: "X-périences",
    type: "website",
    locale: "fr_FR",
  },
  robots: { index: true, follow: true },
};

import styles from "./rencontres-libertines.module.css";

const FAQ = [
  {
    q: "Comment faire des rencontres libertines sérieuses ?",
    a: "En privilégiant la clarté des intentions, le respect du consentement et un cadre qui limite les comportements abusifs. X-périences est conçu pour favoriser des échanges plus fiables.",
  },
  {
    q: "X-périences est-il adapté aux couples libertins ?",
    a: "Oui. Les couples peuvent préciser leurs envies, limites et fonctionnement pour améliorer la compatibilité et éviter les malentendus.",
  },
  {
    q: "Peut-on faire des rencontres libertines en restant discret ?",
    a: "Oui. X-périences adopte une approche orientée confidentialité, afin que vous gardiez la maîtrise de ce que vous partagez.",
  },
  {
    q: "Quels profils peut-on rencontrer ?",
    a: "Des couples et célibataires adultes consentants. L’objectif est de favoriser des échanges plus transparents et respectueux.",
  },
  {
    q: "Le service est-il gratuit ?",
    a: "Les offres peuvent évoluer selon les périodes. Consultez la page d’inscription et/ou la page Abonnement si elle existe sur votre site.",
  },
];

function buildFaqJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };
}

export default function RencontresLibertinesPage() {
  const faqJsonLd = buildFaqJsonLd();

  return (
    <main className={styles.page}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <header className={styles.hero}>
        <div className={styles.heroInner}>
          <p className={styles.kicker}>Rencontres libertines en France</p>
          <h1 className={styles.h1}>Rencontres libertines sérieuses, discrètes et respectueuses</h1>
          <p className={styles.lead}>
            X-périences vous aide à faire des <strong>rencontres libertines</strong> dans un cadre{" "}
            <strong>plus sûr</strong>, <strong>plus clair</strong> et <strong>orienté consentement</strong>.
            L’idée : des échanges authentiques, des intentions lisibles, et moins de pertes de temps.
          </p>

          <div className={styles.ctaRow}>
            <a className={styles.ctaPrimary} href="/inscription">
              S’inscrire
            </a>
            <a className={styles.ctaSecondary} href="/connexion">
              Se connecter
            </a>
          </div>

          <ul className={styles.badges}>
            <li>Compatibilité</li>
            <li>Discrétion</li>
            <li>Consentement</li>
            <li>Modération</li>
          </ul>
        </div>
      </header>

      <section className={styles.section} aria-labelledby="approche">
        <div className={styles.container}>
          <h2 id="approche" className={styles.h2}>
            Une approche plus fiable pour les rencontres libertines
          </h2>
          <p className={styles.p}>
            Les rencontres libertines se passent mieux quand tout est clair : attentes, limites, rythme, discrétion.
            X-périences est construit pour réduire les malentendus et favoriser des échanges plus sains.
          </p>

          <ul className={styles.list}>
            <li>
              <strong>Intentions lisibles</strong> : moins d’ambiguïté, plus de cohérence.
            </li>
            <li>
              <strong>Cadre respectueux</strong> : outils de signalement et modération.
            </li>
            <li>
              <strong>Discrétion</strong> : vous gardez la main sur votre visibilité.
            </li>
            <li>
              <strong>Expérience moderne</strong> : rapide, fluide, pensée mobile.
            </li>
          </ul>
        </div>
      </section>

      <section className={styles.sectionAlt} aria-labelledby="couples-celib">
        <div className={styles.container}>
          <h2 id="couples-celib" className={styles.h2}>
            Couples et célibataires : des rencontres libertines à votre rythme
          </h2>
          <p className={styles.p}>
            Que vous soyez en couple ou célibataire, l’important est d’avancer sans pression. X-périences valorise
            la transparence, le respect et la compatibilité pour augmenter la qualité des échanges.
          </p>

          <div className={styles.grid2}>
            <article className={styles.card}>
              <h3 className={styles.h3}>Couples</h3>
              <p className={styles.p}>
                Précisez votre façon de fonctionner, vos limites et vos envies. Des échanges plus clairs, des rencontres plus compatibles.
              </p>
            </article>

            <article className={styles.card}>
              <h3 className={styles.h3}>Célibataires</h3>
              <p className={styles.p}>
                Un environnement plus lisible et respectueux, où la confiance et le consentement restent la base.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="conseils">
        <div className={styles.container}>
          <h2 id="conseils" className={styles.h2}>
            Conseils simples pour des rencontres libertines sereines
          </h2>

          <ol className={styles.steps}>
            <li>
              <strong>Clarifiez</strong> vos intentions et vos limites dès le début.
            </li>
            <li>
              <strong>Respectez</strong> le consentement et le rythme de chacun.
            </li>
            <li>
              <strong>Privilégiez</strong> les échanges cohérents plutôt que la quantité.
            </li>
            <li>
              <strong>Restez discret</strong> si c’est important pour vous : contrôlez votre visibilité.
            </li>
            <li>
              <strong>Passez au réel</strong> uniquement quand tout est clair des deux côtés.
            </li>
          </ol>
        </div>
      </section>

      <section className={styles.sectionAlt} aria-labelledby="faq">
        <div className={styles.container}>
          <h2 id="faq" className={styles.h2}>
            FAQ – Rencontres libertines
          </h2>

          <div className={styles.faq}>
            {FAQ.map((item) => (
              <details key={item.q} className={styles.faqItem}>
                <summary className={styles.faqQ}>{item.q}</summary>
                <div className={styles.faqA}>
                  <p className={styles.p}>{item.a}</p>
                </div>
              </details>
            ))}
          </div>

          <div className={styles.bottomCta}>
            <p className={styles.p}>Envie de faire des rencontres libertines dans un cadre plus sûr ?</p>
            <a className={styles.ctaPrimary} href="/inscription">
              Créer mon compte
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
