"use client";

/**
 * Corrige les styles résiduels provenant d'autres pages
 * en forçant seulement les layouts critiques de /accueil.
 * Aucun reset global, pas de flash, pas de casse.
 */
export default function AccueilStyleFix() {
  return (
    <style jsx global>{`
      /* Racine accueil : remet l'affichage attendu */
      .accueil-page {
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
        min-height: 100vh !important;
        width: 100% !important;
        padding: 2rem !important;
        box-sizing: border-box !important;
        position: relative !important;
        gap: 25px !important;
        overflow: hidden !important;
        z-index: 1 !important;
        color: #f5ece0 !important;
      }

      /* Pseudo-background */
      .accueil-page::before {
        content: "" !important;
        position: absolute !important;
        inset: 0 !important;
        background-image: url("/images/skin.jpg") !important;
        background-repeat: no-repeat !important;
        background-size: cover !important;
        background-position: center !important;
        opacity: 0.3 !important;
        z-index: -1 !important;
      }

      /* Grille principale */
      .grid-accueil {
        display: grid !important;
        grid-template-columns: 1fr 2fr 1fr !important;
        grid-template-rows: auto auto !important;
        width: 100% !important;
        gap: 16px !important;
      }

      /* Colonne 1 : la sidebar recherche */
      .recherche-sidebar {
        grid-column: 1 !important;
        grid-row: 1 / span 2 !important;
        align-self: start !important;
      }

      /* Colonne 2 : liste profils */
      .profil-list1 {
        display: flex !important;
        flex-direction: column !important;
        gap: 20px !important;
        grid-column: 2 !important;
        grid-row: 1 / span 2 !important;
      }

      /* Colonne 3 : articles + événements */
      .grid-articles {
        grid-column: 3 !important;
        grid-row: 1 !important;
      }
      .grid-event {
        grid-column: 3 !important;
        grid-row: 2 !important;
        text-align: center !important;
      }

      /* Cartes profil (évite qu'un style global les transforme) */
      .profil-card {
        height: 350px !important;
        border: 1px solid #e0c084 !important;
        border-radius: 10px !important;
        padding: 1rem !important;
        text-align: center !important;
        background-color: transparent !important;
        box-shadow: 0 2px 5px rgb(0 0 0 / 10%) !important;
      }
      .profil-photo {
        width: 100% !important;
        object-fit: cover !important;
        border-radius: 8px !important;
      }
      .profil-list1-title,
      .profil-card-title,
      .afficher-plus {
        color: #e0c084 !important;
      }
      .profil-card-title {
        text-align: center !important;
        word-break: break-word !important;
        margin: 0.5rem 0 !important;
      }
      .profil-card-details {
        color: #f5ece0 !important;
      }

      .grid-profil {
        display: grid !important;
        grid-template-columns: 1fr 1fr 1fr !important;
        gap: 10px !important;
        align-items: center !important;
      }

      .profil-toggle-wrapper {
        margin-bottom: 1rem !important;
        display: flex !important;
        align-items: center !important;
        gap: 8px !important;
        font-size: 0.95rem !important;
      }
      .profil-toggle-wrapper input[type="checkbox"] {
        transform: scale(1.2) !important;
        cursor: pointer !important;
      }

      @media (width <= 768px) {
        .grid-accueil {
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
        }
        .toggle-box {
          flex-direction: column !important;
        }
      }
    `}</style>
  );
}
