// Enkel lagring i serverns minne. Data försvinner när containern startas om,
// vilket passar Renders Free-plan där filsystemet inte är beständigt.
export type Todo = { id: number; text: string; done: boolean };

const store = globalThis as unknown as { __todos?: Todo[]; __nextId?: number };
store.__todos ??= [];
store.__nextId ??= 1;

export function listTodos(): Todo[] {
  return store.__todos!;
}

export function addTodo(text: string): Todo {
  const todo = { id: store.__nextId!++, text, done: false };
  store.__todos!.push(todo);
  return todo;
}

export function toggleTodo(id: number): Todo | undefined {
  const todo = store.__todos!.find((t) => t.id === id);
  if (todo) todo.done = !todo.done;
  return todo;
}

export function removeTodo(id: number): boolean {
  const before = store.__todos!.length;
  store.__todos = store.__todos!.filter((t) => t.id !== id);
  return store.__todos.length < before;
}
