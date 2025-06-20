"use client";
import { useEffect } from "react";

export default function TestBeacon() {
  useEffect(() => {
    const handleUnload = () => {
      console.log("🔥 beforeunload déclenché");

      navigator.sendBeacon(
        "/api/ping",
        new Blob([JSON.stringify({ msg: "bye!" })], {
          type: "application/json",
        })
      );
    };

    window.addEventListener("beforeunload", handleUnload);
    return () => {
      window.removeEventListener("beforeunload", handleUnload);
    };
  }, []);

  return <p>📡 Test Beacon actif — ferme ou recharge pour tester</p>;
}
