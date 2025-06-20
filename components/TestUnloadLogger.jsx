"use client";
import { useEffect } from "react";

export default function TestUnloadLogger() {
  useEffect(() => {
    const handleUnload = () => {
      console.log("🔥 beforeunload déclenché !");
    };

    window.addEventListener("beforeunload", handleUnload);

    return () => {
      window.removeEventListener("beforeunload", handleUnload);
    };
  }, []);

  return <p>🔍 Composant de test unload actif</p>;
}
