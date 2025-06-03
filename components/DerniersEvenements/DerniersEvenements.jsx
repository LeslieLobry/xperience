"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";

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
  if (!evenements.length) return <p>Aucun événement récent.</p>;

  return (
    <section>
      <h2>Derniers événements</h2>
      <div>
        {evenements.map((event) => (
          <Link
            href={`/evenements/${event.id}`}
            key={event.id}
          >
            <div>
              <div>
                {event.imageUrl ? (
                  <Image
                    src={event.imageUrl}
                    alt={event.titre}
                    width={250}
                    height={150}
                  />
                ) : (
                  <div>Pas d'image</div>
                )}
              </div>
              <h3>{event.titre}</h3>
              <small>{new Date(event.date).toLocaleDateString()}</small>
              <div>{event.lieu}</div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
