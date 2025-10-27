"use client";
import { useState } from "react";

export default function TestEmailButton() {
  const [state, setState] = useState(null);

  async function send() {
    setState("…");
    const res = await fetch("/api/test-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: "leslielobry@gmail.com" }),
    });
    const data = await res.json();
    setState(JSON.stringify(data, null, 2));
  }

  return (
    <div style={{display:"grid", gap:8}}>
      <button onClick={send}>Tester l’envoi Resend</button>
      {state && <pre style={{whiteSpace:"pre-wrap"}}>{state}</pre>}
    </div>
  );
}
