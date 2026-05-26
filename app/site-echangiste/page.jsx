// app/site-echangiste/page.jsx
export const dynamic = "force-static";

export const metadata = {
  title: "Site échangiste sérieux et sécurisé en France | X-periences",
  description:
    "X-periences est un site échangiste français moderne et sécurisé. Profils de qualité, discrétion, modération, consentement et rencontres compatibles.",
  alternates: {
    canonical: "https://www.x-periences.fr/site-echangiste",
  },
  openGraph: {
    title: "Site échangiste sérieux et sécurisé en France | X-periences",
    description:
      "Site échangiste français moderne et sécurisé : discrétion, modération, consentement, profils plus fiables et rencontres compatibles.",
    url: "https://www.x-periences.fr/site-echangiste",
    siteName: "X-periences",
    type: "website",
    locale: "fr_FR",
  },
  robots: {
    index: true,
    follow: true,
  },
};

import styles from "./site-echangiste.module.css";

const FAQ = [
  {
    q: "X-periences est-il un site échangiste sérieux ?",
    a: "Oui. X-periences vise une expérience plus fiable : profils mieux qualifiés, cadre respectueux, outils de modération et logique orientée confiance.",
  },
  {
    q: "Le site est-il adapté aux couples échangistes ?",
    a: "Oui. X-periences est conçu pour les couples : intentions plus lisibles, échanges plus clairs et rencontres mieux compatibles.",
  },
  {
    q: "Comment limiter les faux profils sur un site échangiste ?",
    a: "X-periences combine des mécanismes de sécurité, des contrôles et de la modération. L’objectif est de réduire les abus et d’améliorer la qualité des échanges.",
  },
  {
    q: "Est-ce discret ?",
    a: "Oui. L’approche est orientée confidentialité : vous gardez la maîtrise de ce que vous partagez, et avec qui.",
  },
  {
    q: "Le site échangiste est-il gratuit ?",
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
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  };
}

export default function SiteEchangistePage() {
  const faqJsonLd = buildFaqJsonLd();

  return (
    <main className={styles.page}>
      {/* JSON-LD FAQ (SEO) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <header className={styles.hero}>
        <div className={styles.heroInner}>
          <p className={styles.kicker}>Site échangiste français</p>
          <h1 className={styles.h1}>X-periences : site échangiste sérieux et sécurisé</h1>
          <p className={styles.lead}>
            X-periences est un <strong>site échangiste français</strong> moderne, pensé pour des{" "}
            <strong>rencontres entre adultes consentants</strong>, dans un cadre{" "}
            <strong>respectueux</strong>, <strong>discret</strong> et <strong>sécurisé</strong>.
            L’objectif : favoriser des échanges authentiques, réduire les faux profils, et placer le{" "}
            <strong>consentement</strong> au centre.
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
            <li>Discrétion</li>
            <li>Modération</li>
            <li>Consentement</li>
            <li>Couples & célibataires</li>
          </ul>
        </div>
      </header>

      <section className={styles.section} aria-labelledby="pourquoi">
        <div className={styles.container}>
          <h2 id="pourquoi" className={styles.h2}>
            Pourquoi choisir X-periences comme site échangiste ?
          </h2>
          <p className={styles.p}>
            Un site échangiste ne devrait pas être un terrain incertain. X-periences se différencie
            par une approche centrée sur la <strong>confiance</strong>, la <strong>sécurité</strong>{" "}
            et la <strong>qualité des échanges</strong>. Le but : une communauté plus saine, où les
            intentions sont claires et les rencontres plus compatibles.
          </p>

          <ul className={styles.list}>
            <li>
              <strong>Expérience moderne</strong> : rapide, fluide, pensée pour le mobile et le web.
            </li>
            <li>
              <strong>Cadre plus sûr</strong> : outils de signalement et modération pour réduire les abus.
            </li>
            <li>
              <strong>Discrétion</strong> : vous gardez le contrôle sur votre visibilité.
            </li>
            <li>
              <strong>Rencontres compatibles</strong> : profils et intentions plus lisibles, moins de malentendus.
            </li>
          </ul>
        </div>
      </section>

      <section className={styles.sectionAlt} aria-labelledby="couples">
        <div className={styles.container}>
          <h2 id="couples" className={styles.h2}>
            Un site échangiste adapté aux couples et aux célibataires
          </h2>
          <p className={styles.p}>
            Que vous soyez un <strong>couple échangiste débutant</strong>, un couple expérimenté, ou un{" "}
            <strong>célibataire</strong> qui respecte les codes, X-periences vous permet d’avancer à votre rythme.
            L’objectif n’est pas d’accumuler des contacts, mais de créer des échanges cohérents, sans pression.
          </p>

          <div className={styles.grid2}>
            <article className={styles.card}>
              <h3 className={styles.h3}>Pour les couples</h3>
              <p className={styles.p}>
                Clarifiez vos envies, vos limites et votre façon de fonctionner. Vous gagnez du temps et améliorez
                la compatibilité des rencontres.
              </p>
            </article>

            <article className={styles.card}>
              <h3 className={styles.h3}>Pour les célibataires</h3>
              <p className={styles.p}>
                Un cadre plus clair et respectueux, où la transparence et le consentement comptent autant que l’attirance.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="securite">
        <div className={styles.container}>
          <h2 id="securite" className={styles.h2}>
            Sécurité, respect et consentement sur un site échangiste
          </h2>
          <p className={styles.p}>
            Les recherches liées à “<strong>site échangiste sérieux</strong>” concernent souvent : faux profils, manque de respect,
            exposition non désirée. X-periences répond à ces enjeux avec une logique simple : renforcer la confiance et protéger la communauté.
          </p>

          <ul className={styles.list}>
            <li>
              <strong>Modération</strong> : prévention et gestion des comportements abusifs.
            </li>
            <li>
              <strong>Contrôle</strong> : vous décidez de ce que vous partagez.
            </li>
            <li>
              <strong>Discrétion</strong> : approche orientée confidentialité.
            </li>
            <li>
              <strong>Consentement</strong> : un cadre clair pour des échanges plus sains.
            </li>
          </ul>
        </div>
      </section>

      <section className={styles.sectionAlt} aria-labelledby="comment">
        <div className={styles.container}>
          <h2 id="comment" className={styles.h2}>
            Comment fonctionne X-periences ?
          </h2>

          <ol className={styles.steps}>
            <li>
              <strong>Inscription</strong> : créez votre profil et précisez vos intentions.
            </li>
            <li>
              <strong>Cadre</strong> : bénéficiez d’un environnement pensé pour limiter les abus.
            </li>
            <li>
              <strong>Découverte</strong> : explorez des profils compatibles avec vos envies.
            </li>
            <li>
              <strong>Échanges</strong> : discutez simplement, à votre rythme, sans pression.
            </li>
            <li>
              <strong>Rencontres</strong> : quand tout est clair des deux côtés, passez au réel.
            </li>
          </ol>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="faq">
        <div className={styles.container}>
          <h2 id="faq" className={styles.h2}>
            FAQ – Site échangiste X-periences
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
            <p className={styles.p}>Prêt à découvrir un site échangiste plus moderne et plus sûr ?</p>
            <a className={styles.ctaPrimary} href="/inscription">
              Créer mon compte
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
