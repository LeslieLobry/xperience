// components/DerniersEvenements/DerniersEvenements.jsx
import Link from "next/link";
import Image from "next/image";
import "./DerniersEvenements.css";

export default function DerniersEvenements({ evenements }) {
  // Date du jour sans les heures
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  // Ne garde que les événements à venir (au moins une date future)
  const evenementsAVenir = (evenements || [])
    .map((event) => {
      // On ne garde que les dates futures pour l'affichage
      const datesAVenir = (event.dates || []).filter(
        (d) => new Date(d).setHours(0, 0, 0, 0) >= now.getTime()
      );
      datesAVenir.sort((a, b) => new Date(a) - new Date(b));
      return {
        ...event,
        datesAVenir,
        prochaineDate: datesAVenir[0] || null,
      };
    })
    .filter((event) => event.datesAVenir.length > 0)
    .sort((a, b) => new Date(a.prochaineDate) - new Date(b.prochaineDate));

  if (!evenementsAVenir.length) {
    return (
      <section className="evenements-section">
        <h2 className="events-title">Derniers événements</h2>
        <div className="evenements-vide">
          <p className="teasing">
            Aucun événement n’est encore publié...
            <br />
            Préparez-vous à vivre de nouvelles <strong>xperiences</strong> très bientôt{" "}
            <span className="pulse">💫</span>
          </p>
          <Link href="/evenements" className="afficher-plus-evenements">
            Voir les événements à venir
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="evenements-section">
      <h2 className="events-title">Derniers événements</h2>
      <div className="evenements-liste">
        {evenementsAVenir.map((event) => (
          <Link
            key={event.id}
            href={`/evenements/${event.id}`}
            className="evenement-card"
          >
            <div className="evenement-image-wrapper">
              {event.imageUrl ? (
                <Image
                  src={event.imageUrl}
                  alt={event.titre}
                  width={250}
                  height={150}
                />
              ) : (
                <div className="evenement-no-image">Pas d'image</div>
              )}
            </div>
            <div className="evenement-infos">
              <h3>{event.titre}</h3>
              <small>
                {event.datesAVenir
                  .map((d) =>
                    new Date(d).toLocaleDateString("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric"
})
                 )
                  .join(", ")}
              </small>
              <div>{event.lieu}</div>
            </div>
          </Link>
        ))}
        <Link href="/evenements" className="afficher-plus-evenements">
          Afficher plus
        </Link>
      </div>
    </section>
  );
}
