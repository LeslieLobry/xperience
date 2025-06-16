"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import "./DerniersEvenements.css";

export default function DerniersEvenements() {
  const [evenements, setEvenements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await fetch("/api/evenements/derniers");
        const data = await res.json();
        setEvenements(data.evenements || []);
      } catch (err) {
        setEvenements([]);
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, []);

  if (loading) return <p>Chargement des événements...</p>;
  if (!evenements.length) return <div>
    <h2 className="events-title">Derniers événements</h2> <span class="teasing">Préparez-vous... de nouvelles <strong>xperiences</strong> arrivent <span class="pulse">💫</span></span>

  </div>
  
;

  return (
    <section className="evenements-section">
      <h2 className="events-title">Derniers événements</h2>
      <div className="evenements-liste">
        {evenements.map((event) => (
          <Link
            href={`/evenements/${event.id}`}
            key={event.id}
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
              <small >{new Date(event.date).toLocaleDateString()}</small>
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
