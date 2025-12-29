// app/site-libertin/page.jsx
export const dynamic = "force-static";

export const metadata = {
  title: "Site libertin sérieux et sécurisé en France | X-périences",
  description:
    "X-périences est un site libertin français moderne et sécurisé pour couples et célibataires. Vérification d’identité, discrétion, modération et respect du consentement.",
  alternates: {
    canonical: "https://www.x-periences.fr/site-libertin",
  },
  openGraph: {
    title: "Site libertin sérieux et sécurisé en France | X-périences",
    description:
      "Un site libertin français moderne et sécurisé pour couples et célibataires : vérification, discrétion, modération, consentement.",
    url: "https://www.x-periences.fr/site-libertin",
    siteName: "X-périences",
    type: "website",
    locale: "fr_FR",
  },
  robots: {
    index: true,
    follow: true,
  },
};

import styles from "./site-libertin.module.css";

const FAQ = [
  {
    q: "X-périences est-il un site libertin sérieux ?",
    a: "Oui. X-périences met l’accent sur la qualité des profils, la modération, la sécurité et le respect du consentement pour proposer une expérience plus fiable qu’un site libertin classique.",
  },
  {
    q: "Peut-on s’inscrire en couple sur X-périences ?",
    a: "Oui. X-périences est adapté aux couples et permet de présenter clairement vos envies, vos limites et votre façon de fonctionner, afin de favoriser des rencontres compatibles.",
  },
  {
    q: "Comment X-périences limite les faux profils ?",
    a: "La plateforme s’appuie sur des mécanismes de sécurité et de modération. L’objectif est de réduire les comportements abusifs et d’améliorer la confiance au sein de la communauté.",
  },
  {
    q: "Le site est-il discret ?",
    a: "Oui. X-périences propose des fonctionnalités orientées confidentialité (par exemple des espaces et contenus contrôlés) pour garder la maîtrise de ce que vous partagez.",
  },
  {
    q: "X-périences est-il gratuit ?",
    a: "L’accès et les fonctionnalités peuvent évoluer selon les périodes et les offres. Le plus simple est de consulter la page d’inscription et/ou la page Abonnement si elle existe sur votre site.",
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

export default function SiteLibertinPage() {
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
          <p className={styles.kicker}>Site libertin français</p>
          <h1 className={styles.h1}>X-périences : site libertin sérieux et sécurisé</h1>
          <p className={styles.lead}>
            X-périences est un <strong>site libertin français</strong> moderne, pensé pour les{" "}
            <strong>couples</strong> et <strong>célibataires</strong> qui veulent découvrir le
            libertinage dans un cadre <strong>respectueux</strong>, <strong>discret</strong> et{" "}
            <strong>sécurisé</strong>. Ici, l’objectif est simple : favoriser des rencontres
            authentiques, limiter les faux profils, et mettre le <strong>consentement</strong> au
            centre de l’expérience.
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
            <li>Communauté</li>
          </ul>
        </div>
      </header>

      <section className={styles.section} aria-labelledby="pourquoi">
        <div className={styles.container}>
          <h2 id="pourquoi" className={styles.h2}>
            Pourquoi choisir X-périences comme site libertin ?
          </h2>
          <p className={styles.p}>
            Choisir un site libertin ne devrait jamais être un pari risqué. X-périences se
            différencie par une approche centrée sur la <strong>confiance</strong>, la{" "}
            <strong>sécurité</strong> et la <strong>qualité des échanges</strong>. L’objectif : une
            communauté plus saine, plus claire, plus agréable à vivre.
          </p>

          <ul className={styles.list}>
            <li>
              <strong>Expérience moderne</strong> : interface rapide, fluide, pensée pour le mobile
              et le web.
            </li>
            <li>
              <strong>Cadre plus sûr</strong> : outils de modération et de signalement pour réduire
              les abus.
            </li>
            <li>
              <strong>Discrétion</strong> : vous gardez le contrôle sur ce que vous montrez et à qui.
            </li>
            <li>
              <strong>Rencontres compatibles</strong> : profils et intentions plus lisibles pour
              éviter les malentendus.
            </li>
          </ul>
        </div>
      </section>

      <section className={styles.sectionAlt} aria-labelledby="couples-celib">
        <div className={styles.container}>
          <h2 id="couples-celib" className={styles.h2}>
            Un site libertin adapté aux couples et aux célibataires
          </h2>
          <p className={styles.p}>
            Que vous soyez un <strong>couple libertin débutant</strong>, un couple expérimenté, ou un{" "}
            <strong>célibataire</strong> qui respecte les codes du libertinage, X-périences vous
            permet d’avancer à votre rythme. Le but n’est pas d’accumuler des contacts, mais de
            créer des échanges cohérents, sans pression.
          </p>

          <div className={styles.grid2}>
            <article className={styles.card}>
              <h3 className={styles.h3}>Pour les couples</h3>
              <p className={styles.p}>
                Clarifiez vos envies, vos limites et votre style. Vous gagnez du temps et vous
                améliorez la compatibilité des rencontres.
              </p>
            </article>

            <article className={styles.card}>
              <h3 className={styles.h3}>Pour les célibataires</h3>
              <p className={styles.p}>
                Un cadre plus clair et respectueux, où la confiance et la transparence comptent
                autant que l’attirance.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="securite">
        <div className={styles.container}>
          <h2 id="securite" className={styles.h2}>
            Sécurité et discrétion : une priorité sur un site libertin
          </h2>
          <p className={styles.p}>
            Les recherches autour d’un “<strong>site libertin sérieux</strong>” tournent souvent
            autour des mêmes inquiétudes : faux profils, manque de respect, exposition non désirée.
            X-périences répond à ces enjeux avec une logique simple : renforcer la confiance et
            protéger la communauté.
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
            Comment fonctionne X-périences ?
          </h2>

          <ol className={styles.steps}>
            <li>
              <strong>Inscription</strong> : créez votre profil et précisez vos intentions.
            </li>
            <li>
              <strong>Confiance</strong> : profitez d’un cadre pensé pour limiter les abus.
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
            FAQ – Site libertin X-périences
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
            <p className={styles.p}>
              Prêt à découvrir un site libertin plus moderne et plus sécurisé ?
            </p>
            <a className={styles.ctaPrimary} href="/inscription">
              Créer mon compte
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
