import type { TodoId } from './todo-items';

export function normalizeTodoOrder(value: unknown, ids: TodoId[]): TodoId[] {
  const stored = Array.isArray(value) ? value : [];
  const allowed = new Set(ids);
  const valid = stored.filter((id): id is TodoId => allowed.has(id));
  return [...new Set([...valid, ...ids])];
}

export function moveTodo(order: TodoId[], id: TodoId, target: TodoId): TodoId[] {
  const from = order.indexOf(id), to = order.indexOf(target);
  if (from < 0 || to < 0 || from === to) return order;
  const next = [...order];
  next.splice(from, 1);
  next.splice(to, 0, id);
  return next;
}

export function completedFirst(order: TodoId[], data: Record<string, any>): TodoId[] {
  return [...order.filter(id => !!data['todo:' + id]?.done), ...order.filter(id => !data['todo:' + id]?.done)];
}
