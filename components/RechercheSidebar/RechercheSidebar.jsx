"use client";
import { useState, useEffect } from "react";
import "./recherche-sidebar.css";

export default function RechercheSidebar({ onSearch, className }) {
  const [ageMin, setAgeMin] = useState("");
  const [rayon, setRayon] = useState("");
  const [ville, setVille] = useState("");

  console.log("[MiniSidebar] render", { ageMin, rayon, ville });

  useEffect(() => {
    console.log("[MiniSidebar] MOUNT");
    return () => console.log("[MiniSidebar] UNMOUNT");
  }, []);

  return (
    <aside className={`recherche-sidebar ${className || ""}`}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          console.log("[MiniSidebar] SUBMIT", { ageMin, rayon, ville });
          onSearch?.({ ageMin, rayon, ville });
        }}
      >
        <div className="filters-group">
          <h4>Âge min</h4>
          <input
            type="number"
            name="ageMin"
            placeholder="Min"
            value={ageMin}
            onChange={(e) => {
              console.log("[MiniSidebar] ageMin onChange:", e.target.value);
              setAgeMin(e.target.value);
            }}
          />
        </div>

        <div className="filters-group">
          <h4>Rayon (km)</h4>
          <input
            type="number"
            name="rayon"
            placeholder="Rayon"
            value={rayon}
            onChange={(e) => {
              console.log("[MiniSidebar] rayon onChange:", e.target.value);
              setRayon(e.target.value);
            }}
          />
        </div>

        <div className="filters-group">
          <h4>Ville</h4>
          <input
            type="text"
            name="ville"
            placeholder="Commune"
            value={ville}
            onChange={(e) => {
              console.log("[MiniSidebar] ville onChange:", e.target.value);
              setVille(e.target.value);
            }}
          />
        </div>

        <button type="submit" className="recherche-button">
          Tester
        </button>
      </form>
    </aside>
  );
}
