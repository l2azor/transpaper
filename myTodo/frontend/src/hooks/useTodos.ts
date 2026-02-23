import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import type { Todo, CreateTodoInput, UpdateTodoInput, FilterStatus } from '../types';

export function useTodos() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [search, setSearch] = useState('');

  const fetchTodos = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getTodos();
      setTodos(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch todos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTodos();
  }, [fetchTodos]);

  const addTodo = async (input: CreateTodoInput) => {
    const todo = await api.createTodo(input);
    setTodos(prev => [todo, ...prev]);
  };

  const updateTodo = async (id: number, input: UpdateTodoInput) => {
    const updated = await api.updateTodo(id, input);
    setTodos(prev => prev.map(t => (t.id === id ? updated : t)));
  };

  const deleteTodo = async (id: number) => {
    await api.deleteTodo(id);
    setTodos(prev => prev.filter(t => t.id !== id));
  };

  const toggleTodo = async (id: number) => {
    const todo = todos.find(t => t.id === id);
    if (!todo) return;
    await updateTodo(id, { completed: !todo.completed });
  };

  const filteredTodos = todos.filter(todo => {
    if (filter === 'completed' && !todo.completed) return false;
    if (filter === 'active' && todo.completed) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        todo.title.toLowerCase().includes(q) ||
        (todo.description?.toLowerCase().includes(q) ?? false)
      );
    }
    return true;
  });

  return {
    todos: filteredTodos,
    allTodos: todos,
    loading,
    error,
    filter,
    search,
    setFilter,
    setSearch,
    addTodo,
    updateTodo,
    deleteTodo,
    toggleTodo,
    refetch: fetchTodos,
  };
}
