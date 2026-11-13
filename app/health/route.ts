import { connection } from "next/server";
import { getConfig } from "@/lib/config";

// Health check: visar att servern lever. Används av Render (Health Check Path)
// och av Dockerfilens HEALTHCHECK. Innehåller inga hemligheter.
export async function GET() {
  // Gör svaret dynamiskt: beräknas vid varje anrop och cachas aldrig.
  await connection();

  return Response.json(
    {
      status: "ok",
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
      environment: getConfig().appEnv,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
