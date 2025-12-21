export const metadata = {
  title: "Support — Xperiences",
  description: "Assistance, contact et aide pour l’application Xperiences.",
};

import styles from "./SupportPage.module.css";

export default function SupportPage() {
  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1 className={styles.title}>Support Xperiences</h1>
          <p className={styles.subtitle}>
            Une question, un bug, besoin d’aide ? Contactez-nous et on vous répond rapidement.
          </p>
        </header>

        <section className={styles.card}>
          <h2 className={styles.h2}>Contact</h2>

          <div className={styles.contactGrid}>
            <div className={styles.contactItem}>
              <p className={styles.label}>Email support</p>
              <p className={styles.value}>
                <a className={styles.link} href="mailto:support@x-periences.fr">
                     contact@x-periences.fr
                </a>
              </p>
              <p className={styles.small}>
                Merci d’indiquer votre modèle d’appareil + version iOS/iPadOS si vous signalez un bug.
              </p>
            </div>

            <div className={styles.contactItem}>
              <p className={styles.label}>Délai de réponse</p>
              <p className={styles.value}>24–72h (jours ouvrés)</p>
              <p className={styles.small}>En cas d’urgence, précisez “URGENT” dans l’objet.</p>
            </div>
          </div>
        </section>

        <section className={styles.card}>
          <h2 className={styles.h2}>Problèmes fréquents</h2>

          <div className={styles.faq}>
            <details className={styles.details}>
              <summary className={styles.summary}>Je n’arrive pas à me connecter</summary>
              <div className={styles.answer}>
                <ul>
                  <li>Vérifiez que l’email et le mot de passe sont corrects.</li>
                  <li>Essayez en 4G/5G si votre Wi-Fi bloque.</li>
                  <li>Redémarrez l’application puis réessayez.</li>
                </ul>
              </div>
            </details>

            <details className={styles.details}>
              <summary className={styles.summary}>L’application charge indéfiniment</summary>
              <div className={styles.answer}>
                <ul>
                  <li>Vérifiez votre connexion internet.</li>
                  <li>Fermez complètement l’application puis relancez-la.</li>
                  <li>Si le problème persiste, contactez-nous (avec votre modèle d’appareil).</li>
                </ul>
              </div>
            </details>

            <details className={styles.details}>
              <summary className={styles.summary}>Je veux supprimer mon compte</summary>
              <div className={styles.answer}>
                <p>
                  La suppression de compte est disponible directement dans l’application (Paramètres).
                  Si vous n’y avez plus accès, écrivez-nous depuis votre email de compte.
                </p>
              </div>
            </details>

            <details className={styles.details}>
              <summary className={styles.summary}>Signaler un profil / un message</summary>
              <div className={styles.answer}>
                <p>
                  Utilisez le bouton de signalement dans l’application. Vous pouvez aussi nous écrire
                  en indiquant le pseudo concerné et une description du problème.
                </p>
              </div>
            </details>
          </div>
        </section>

        <section className={styles.card}>
          <h2 className={styles.h2}>Informations utiles pour un bug</h2>
          <p className={styles.p}>
            Pour qu’on règle vite, envoyez :
          </p>
          <ul className={styles.ul}>
            <li>Votre appareil (ex : iPhone 14, iPad Air 5)</li>
            <li>La version iOS/iPadOS</li>
            <li>Les étapes exactes pour reproduire</li>
            <li>Une capture ou une courte vidéo si possible</li>
          </ul>
        </section>

        <footer className={styles.footer}>
          <p className={styles.footerText}>
            © {new Date().getFullYear()} Xperiences — Support
          </p>
        </footer>
      </div>
    </main>
  );
}
