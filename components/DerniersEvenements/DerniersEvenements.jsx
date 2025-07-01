// components/DerniersEvenements/DerniersEvenements.jsx
import Link from "next/link";
import Image from "next/image";
import "./DerniersEvenements.css";

export default function DerniersEvenements({ evenements }) {
  if (!evenements?.length) {
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
        {evenements.map((event) => (
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
              <small>{new Date(event.date).toLocaleDateString()}</small>
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
