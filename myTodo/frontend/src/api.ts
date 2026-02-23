import type { Todo, CreateTodoInput, UpdateTodoInput } from './types';

const API_URL = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:4179`;

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export const api = {
  getTodos(): Promise<Todo[]> {
    return request<Todo[]>('/api/todos');
  },

  getTodo(id: number): Promise<Todo> {
    return request<Todo>(`/api/todos/${id}`);
  },

  createTodo(input: CreateTodoInput): Promise<Todo> {
    return request<Todo>('/api/todos', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  updateTodo(id: number, input: UpdateTodoInput): Promise<Todo> {
    return request<Todo>(`/api/todos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    });
  },

  deleteTodo(id: number): Promise<void> {
    return request<void>(`/api/todos/${id}`, { method: 'DELETE' });
  },
};
