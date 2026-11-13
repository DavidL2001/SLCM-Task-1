// Körs en gång när Next.js-servern startar, innan den tar emot förfrågningar.
// Här skriver vi startloggen: bevis på att appen kom igång (syns t.ex. i Renders loggvy).

export async function register() {
  // Bara i Node.js-miljön (inte Edge), eftersom vi använder process.version.
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { logger } = await import("@/lib/logger");
  const { getConfig } = await import("@/lib/config");
  const config = getConfig();

  logger.info("Servern startar", {
    environment: config.appEnv,
    logLevel: config.logLevel,
    port: process.env.PORT || "3000",
    nodeVersion: process.version,
  });
}
