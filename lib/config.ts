import "server-only";

// Central konfiguration: alla miljövariabler läses och valideras här, på ett ställe.
// Servervariabler läses vid ANROP (körning), inte när modulen importeras. Då kan
// samma Docker-image köras i olika miljöer med olika värden.

const APP_ENVS = ["development", "production"] as const;
const LOG_LEVELS = ["debug", "info", "warn", "error"] as const;

export type AppEnv = (typeof APP_ENVS)[number];
export type LogLevel = (typeof LOG_LEVELS)[number];

function oneOf<T extends string>(name: string, value: string, allowed: readonly T[]): T {
  if ((allowed as readonly string[]).includes(value)) return value as T;
  throw new Error(`Ogiltigt värde för ${name}: "${value}". Tillåtna: ${allowed.join(", ")}`);
}

export function getConfig() {
  // Beteende som skiljer sig mellan dev och prod. Standardvärdet följer NODE_ENV.
  const appEnv = oneOf(
    "APP_ENV",
    process.env.APP_ENV || (process.env.NODE_ENV === "production" ? "production" : "development"),
    APP_ENVS,
  );

  // Hur mycket som loggas. Standard: mycket i dev, mindre i prod.
  const logLevel = oneOf(
    "LOG_LEVEL",
    process.env.LOG_LEVEL || (appEnv === "production" ? "info" : "debug"),
    LOG_LEVELS,
  );

  // Serverhemlighet (valfri). Läses bara på servern och skickas aldrig till webbläsaren.
  const apiSecretKey = process.env.API_SECRET_KEY || undefined;

  return {
    appEnv,
    logLevel,
    isProduction: appEnv === "production",
    apiSecretKey,
    // Säkert att visa i gränssnittet: berättar bara OM nyckeln finns, aldrig vad den är.
    hasApiSecret: Boolean(apiSecretKey),
  };
}

// Publik variabel. Prefixet NEXT_PUBLIC_ gör att värdet bakas in i JavaScript-koden
// vid `npm run build` och syns för alla i webbläsaren, så den är ALDRIG hemlig.
// Måste skrivas som `process.env.NEXT_PUBLIC_...` (bokstavligt) för att kunna bakas in.
export const publicConfig = {
  appName: process.env.NEXT_PUBLIC_APP_NAME || "CI/CD-demo",
};
