import { useState } from 'react';
import type { Todo, UpdateTodoInput, Priority } from '../types';

interface Props {
  todo: Todo;
  onUpdate: (id: number, input: UpdateTodoInput) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onToggle: (id: number) => Promise<void>;
}

const priorityConfig: Record<Priority, { color: string; bg: string; label: string }> = {
  high: { color: 'text-rose-700', bg: 'bg-rose-100', label: 'High' },
  medium: { color: 'text-amber-700', bg: 'bg-amber-100', label: 'Medium' },
  low: { color: 'text-emerald-700', bg: 'bg-emerald-100', label: 'Low' },
};

export function TodoItem({ todo, onUpdate, onDelete, onToggle }: Props) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(todo.title);
  const [description, setDescription] = useState(todo.description || '');
  const [priority, setPriority] = useState<Priority>(todo.priority);
  const [dueDate, setDueDate] = useState(todo.dueDate || '');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saving, setSaving] = useState(false);

  const pCfg = priorityConfig[todo.priority];

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      await onUpdate(todo.id, {
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        dueDate: dueDate || undefined,
      });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setTitle(todo.title);
    setDescription(todo.description || '');
    setPriority(todo.priority);
    setDueDate(todo.dueDate || '');
    setEditing(false);
  };

  const handleDelete = async () => {
    await onDelete(todo.id);
  };

  const isOverdue = todo.dueDate && !todo.completed && new Date(todo.dueDate) < new Date(new Date().toDateString());

  if (editing) {
    return (
      <div className="glass-card rounded-xl p-4 !border-accent/30">
        <div className="space-y-3">
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="input-glass w-full px-3 py-2 rounded-lg text-sm"
            autoFocus
          />
          <textarea
            placeholder="Description"
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={2}
            className="input-glass w-full px-3 py-2 rounded-lg text-sm resize-none"
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Priority</label>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value as Priority)}
                className="input-glass w-full px-3 py-2 rounded-lg text-sm"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="input-glass w-full px-3 py-2 rounded-lg text-sm"
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-black/5 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!title.trim() || saving}
              className="btn-accent px-4 py-2 text-sm rounded-lg"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`glass-card rounded-xl p-4 ${todo.completed ? 'opacity-40' : ''}`}>
      <div className="flex items-start gap-3">
        <button
          onClick={() => onToggle(todo.id)}
          className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
            todo.completed
              ? 'bg-accent border-accent'
              : 'border-text-muted/50 hover:border-accent'
          }`}
        >
          {todo.completed && (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-bg-primary check-animate" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="3">
              <path d="M6 10l3 3 5-6" />
            </svg>
          )}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className={`text-sm font-medium ${todo.completed ? 'line-through text-text-muted' : 'text-text-primary'}`}>
              {todo.title}
            </h3>
            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${pCfg.bg} ${pCfg.color}`}>
              {pCfg.label}
            </span>
          </div>
          {todo.description && (
            <p className={`text-sm mt-1 ${todo.completed ? 'text-text-muted/50' : 'text-text-secondary'}`}>
              {todo.description}
            </p>
          )}
          {todo.dueDate && (
            <p className={`text-xs mt-1.5 ${isOverdue ? 'text-rose-400 font-medium animate-overdue' : 'text-text-muted'}`}>
              {isOverdue ? 'Overdue: ' : 'Due: '}
              {new Date(todo.dueDate).toLocaleDateString('ko-KR')}
            </p>
          )}
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => setEditing(true)}
            className="p-1.5 text-text-muted hover:text-accent rounded-lg transition-colors"
            title="Edit"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
            </svg>
          </button>
          {confirmDelete ? (
            <div className="flex items-center gap-1">
              <button
                onClick={handleDelete}
                className="px-2 py-1 text-xs bg-rose-100 text-rose-700 rounded-md hover:bg-rose-200 transition-colors"
              >
                Delete
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="px-2 py-1 text-xs text-text-muted hover:bg-black/5 rounded-md transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="p-1.5 text-text-muted hover:text-rose-400 rounded-lg transition-colors"
              title="Delete"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
