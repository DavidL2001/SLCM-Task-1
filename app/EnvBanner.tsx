import { connection } from "next/server";
import { getConfig } from "@/lib/config";

// Visar vilken miljö appen körs i. Inga hemligheter visas.
// `connection()` gör att komponenten renderas vid varje förfrågan, så värdena
// läses vid körning (inte bakas in vid build).
export default async function EnvBanner() {
  await connection();
  const { appEnv, logLevel, hasApiSecret } = getConfig();

  return (
    <div className={`env-banner env-${appEnv}`}>
      Miljö: <strong>{appEnv}</strong> · Loggnivå: {logLevel} · API-nyckel:{" "}
      {hasApiSecret ? "konfigurerad" : "saknas"}
    </div>
  );
}
