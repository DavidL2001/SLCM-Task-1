"use client";

import { useEffect, useState } from "react";
import type { Todo } from "@/lib/todos";

const API = "/api/todos";

export default function TodoList() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [text, setText] = useState("");
  const [error, setError] = useState("");

  async function load() {
    const res = await fetch(API);
    setTodos(await res.json());
  }

  useEffect(() => {
    fetch(API)
      .then((res) => res.json())
      .then(setTodos)
      .catch(() => setError("Kunde inte hämta listan."));
  }, []);

  async function send(method: string, body: object) {
    setError("");
    const res = await fetch(API, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Något gick fel.");
      return false;
    }
    await load();
    return true;
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (await send("POST", { text })) setText("");
  }

  return (
    <>
      <form onSubmit={add} className="todo-form">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Ny uppgift"
          aria-label="Ny uppgift"
        />
        <button type="submit">Lägg till</button>
      </form>
      {error && <p role="alert" className="todo-error">{error}</p>}
      <ul className="todo-list">
        {todos.map((t) => (
          <li key={t.id}>
            <label className={t.done ? "todo-done" : undefined}>
              <input
                type="checkbox"
                checked={t.done}
                onChange={() => send("PATCH", { id: t.id })}
              />
              {t.text}
            </label>
            <button onClick={() => send("DELETE", { id: t.id })}>Ta bort</button>
          </li>
        ))}
      </ul>
      {todos.length === 0 && <p>Inga uppgifter ännu.</p>}
    </>
  );
}
