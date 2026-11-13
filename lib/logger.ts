import { getConfig, type LogLevel } from "@/lib/config";

// Liten logghjälpare: en rad per händelse som JSON (tid, nivå, meddelande, data).
// Skriver till stdout/stderr via console, så att loggarna syns i terminalen och i Renders loggvy.

const ORDER: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };

function write(level: LogLevel, message: string, data?: Record<string, unknown>) {
  // Visa bara rader på eller över LOG_LEVEL (t.ex. info döljer debug).
  if (ORDER[level] < ORDER[getConfig().logLevel]) return;

  const line = JSON.stringify({
    time: new Date().toISOString(),
    level,
    message,
    ...(data ? { data } : {}),
  });

  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else if (level === "info") console.info(line);
  else console.debug(line);
}

export const logger = {
  debug: (message: string, data?: Record<string, unknown>) => write("debug", message, data),
  info: (message: string, data?: Record<string, unknown>) => write("info", message, data),
  warn: (message: string, data?: Record<string, unknown>) => write("warn", message, data),
  error: (message: string, data?: Record<string, unknown>) => write("error", message, data),
};
