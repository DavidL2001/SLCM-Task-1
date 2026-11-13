import { addTodo, listTodos, removeTodo, toggleTodo } from "@/lib/todos";
import { logger } from "@/lib/logger";

// Läser JSON-body och returnerar null om den är ogiltig.
async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = await request.json();
    return body && typeof body === "object" ? body : null;
  } catch {
    return null;
  }
}

// Felsvar: ett kort meddelande till användaren. Detaljerna loggas med console.error
// (via loggern) och stackspår skickas aldrig till webbläsaren.
function fail(status: number, message: string, method: string, reason: string) {
  logger.error("Förfrågan misslyckades", { route: "/api/todos", method, status, reason });
  return Response.json({ error: message }, { status });
}

// Fångar oväntade undantag så att användaren får ett vettigt 500-svar.
async function guard(method: string, handler: () => Promise<Response>) {
  try {
    return await handler();
  } catch (error) {
    logger.error("Oväntat fel i API-routen", {
      route: "/api/todos",
      method,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return Response.json({ error: "Något gick fel på servern." }, { status: 500 });
  }
}

export async function GET() {
  return guard("GET", async () => {
    const todos = listTodos();
    logger.info("Hämtade att göra-listan", { route: "/api/todos", method: "GET", count: todos.length });
    return Response.json(todos);
  });
}

export async function POST(request: Request) {
  return guard("POST", async () => {
    const body = await readJson(request);
    const text = typeof body?.text === "string" ? body.text.trim() : "";
    if (!text || text.length > 200) {
      return fail(400, "Text krävs (max 200 tecken).", "POST", "ogiltig text");
    }
    const todo = addTodo(text);
    logger.info("Ny uppgift skapad", { route: "/api/todos", method: "POST", id: todo.id });
    return Response.json(todo, { status: 201 });
  });
}

export async function PATCH(request: Request) {
  return guard("PATCH", async () => {
    const body = await readJson(request);
    if (typeof body?.id !== "number") return fail(400, "id krävs.", "PATCH", "id saknas");
    const todo = toggleTodo(body.id);
    if (!todo) return fail(404, "Hittades inte.", "PATCH", `id ${body.id} finns inte`);
    logger.info("Uppgift ändrad", { route: "/api/todos", method: "PATCH", id: todo.id, done: todo.done });
    return Response.json(todo);
  });
}

export async function DELETE(request: Request) {
  return guard("DELETE", async () => {
    const body = await readJson(request);
    if (typeof body?.id !== "number") return fail(400, "id krävs.", "DELETE", "id saknas");
    if (!removeTodo(body.id)) return fail(404, "Hittades inte.", "DELETE", `id ${body.id} finns inte`);
    logger.info("Uppgift borttagen", { route: "/api/todos", method: "DELETE", id: body.id });
    return new Response(null, { status: 204 });
  });
}
