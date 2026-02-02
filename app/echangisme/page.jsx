// app/echangisme/page.jsx
export const dynamic = "force-static";

export const metadata = {
  title: "Échangisme : comprendre, pratiquer avec respect | X-périences",
  description:
    "Échangisme : définition, principes, consentement et bonnes pratiques. X-périences propose un cadre moderne et discret pour des échanges plus clairs.",
  alternates: {
    canonical: "https://www.x-periences.fr/echangisme",
  },
  openGraph: {
    title: "Échangisme : comprendre, pratiquer avec respect | X-périences",
    description:
      "Guide sur l’échangisme : définition, consentement, limites, discrétion. Un cadre plus clair pour des échanges plus sereins.",
    url: "https://www.x-periences.fr/echangisme",
    siteName: "X-périences",
    type: "website",
    locale: "fr_FR",
  },
  robots: { index: true, follow: true },
};

import styles from "./echangisme.module.css";

const FAQ = [
  {
    q: "C’est quoi l’échangisme ?",
    a: "L’échangisme désigne une pratique entre adultes consentants où un couple peut vivre des expériences avec d’autres personnes, dans un cadre défini par des règles et des limites claires.",
  },
  {
    q: "Quelles sont les règles de base en échangisme ?",
    a: "Consentement, respect, communication, limites claires, absence de pression et discrétion. L’objectif est que l’expérience reste positive pour tout le monde.",
  },
  {
    q: "Comment débuter l’échangisme ?",
    a: "Commencez par discuter en couple, définir vos limites, avancer progressivement, et privilégier des échanges clairs avec des personnes compatibles.",
  },
  {
    q: "Comment rester discret ?",
    a: "En contrôlant votre visibilité, en évitant de partager trop vite des informations personnelles et en choisissant un cadre orienté confidentialité.",
  },
  {
    q: "Pourquoi utiliser une plateforme plutôt que l’improvisation ?",
    a: "Une plateforme peut aider à clarifier les intentions, filtrer, réduire les comportements abusifs et favoriser des échanges plus cohérents.",
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

export default function EchangismePage() {
  const faqJsonLd = buildFaqJsonLd();

  return (
    <main className={styles.page}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <header className={styles.hero}>
        <div className={styles.heroInner}>
          <p className={styles.kicker}>Guide</p>
          <h1 className={styles.h1}>Échangisme : comprendre, définir vos règles, avancer sereinement</h1>
          <p className={styles.lead}>
            L’<strong>échangisme</strong> repose sur des bases simples : <strong>consentement</strong>,{" "}
            <strong>communication</strong>, <strong>respect</strong> et <strong>discrétion</strong>.
            Ce guide vous aide à comprendre les principes et à avancer progressivement, sans pression.
          </p>

          <div className={styles.ctaRow}>
            <a className={styles.ctaPrimary} href="/inscription">
              S’inscrire
            </a>
            <a className={styles.ctaSecondary} href="/site-echangiste">
              Découvrir le site échangiste
            </a>
          </div>

          <ul className={styles.badges}>
            <li>Consentement</li>
            <li>Limites</li>
            <li>Communication</li>
            <li>Discrétion</li>
          </ul>
        </div>
      </header>

      <section className={styles.section} aria-labelledby="definition">
        <div className={styles.container}>
          <h2 id="definition" className={styles.h2}>
            Définition : qu’est-ce que l’échangisme ?
          </h2>
          <p className={styles.p}>
            L’échangisme désigne une pratique entre <strong>adultes consentants</strong>, souvent au sein d’un couple,
            où l’on explore des expériences avec d’autres personnes. Il n’existe pas “une” manière unique : tout dépend
            des limites, des règles et du niveau de discrétion souhaité.
          </p>
        </div>
      </section>

      <section className={styles.sectionAlt} aria-labelledby="bases">
        <div className={styles.container}>
          <h2 id="bases" className={styles.h2}>
            Les bases : consentement, respect, communication
          </h2>

          <ul className={styles.list}>
            <li>
              <strong>Consentement</strong> : toujours explicite, jamais implicite.
            </li>
            <li>
              <strong>Communication</strong> : avant, pendant, après — pour rester alignés.
            </li>
            <li>
              <strong>Respect</strong> : aucune pression, pas d’insistance, pas de jugement.
            </li>
            <li>
              <strong>Discrétion</strong> : protéger votre vie privée selon vos besoins.
            </li>
          </ul>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="debuter">
        <div className={styles.container}>
          <h2 id="debuter" className={styles.h2}>
            Comment débuter l’échangisme sans se mettre la pression ?
          </h2>

          <ol className={styles.steps}>
            <li>
              <strong>Discutez</strong> en couple : envies, limites, zones de confort.
            </li>
            <li>
              <strong>Avancez progressivement</strong> : rien n’est obligatoire.
            </li>
            <li>
              <strong>Choisissez</strong> des échanges clairs avec des personnes compatibles.
            </li>
            <li>
              <strong>Fixez</strong> un cadre : règles, stop, signaux, confidentialité.
            </li>
            <li>
              <strong>Débriefez</strong> après : ajustez vos limites et votre rythme.
            </li>
          </ol>
        </div>
      </section>

      <section className={styles.sectionAlt} aria-labelledby="faq">
        <div className={styles.container}>
          <h2 id="faq" className={styles.h2}>
            FAQ – Échangisme
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
              Vous voulez un cadre plus clair pour rencontrer des adultes consentants ?
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
