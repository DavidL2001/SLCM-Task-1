"use client"; // Felgränser måste vara klientkomponenter

import { useEffect } from "react";

// Visas när något oväntat går fel vid rendering. Inga stackspår visas för användaren.
export default function Error({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    // Loggas i webbläsarens konsol. Serverfel loggas separat på servern.
    console.error(error);
  }, [error]);

  return (
    <div>
      <h1>Något gick fel</h1>
      <p>Ett oväntat fel inträffade. Försök igen om en stund.</p>
      <button onClick={() => retry()}>Försök igen</button>
    </div>
  );
}
