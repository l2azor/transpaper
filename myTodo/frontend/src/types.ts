export type Priority = 'high' | 'medium' | 'low';
export type FilterStatus = 'all' | 'completed' | 'active';

export interface Todo {
  id: number;
  title: string;
  description?: string;
  priority: Priority;
  dueDate?: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTodoInput {
  title: string;
  description?: string;
  priority?: Priority;
  dueDate?: string;
}

export interface UpdateTodoInput {
  title?: string;
  description?: string;
  priority?: Priority;
  dueDate?: string;
  completed?: boolean;
}
