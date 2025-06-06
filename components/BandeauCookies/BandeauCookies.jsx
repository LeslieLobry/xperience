"use client";

import { useEffect, useState } from "react";
import "./BandeauCookies.css";

export default function BandeauCookies() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const accepted = localStorage.getItem("cookiesAccepted");
    if (!accepted) setVisible(true);
  }, []);

  const acceptCookies = () => {
    localStorage.setItem("cookiesAccepted", "true");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="bandeau-cookies">
      <p>
        Xperiences utilise des cookies pour assurer le bon fonctionnement du site.
        <a href="/cookies"> En savoir plus</a>
      </p>
      <button onClick={acceptCookies}>Accepter</button>
    </div>
  );
}
