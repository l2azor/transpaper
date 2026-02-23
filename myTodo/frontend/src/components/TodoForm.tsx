import { useState } from 'react';
import type { CreateTodoInput, Priority } from '../types';

interface Props {
  onSubmit: (input: CreateTodoInput) => Promise<void>;
}

export function TodoForm({ onSubmit }: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [dueDate, setDueDate] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        dueDate: dueDate || undefined,
      });
      setTitle('');
      setDescription('');
      setPriority('medium');
      setDueDate('');
      setExpanded(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="glass-card rounded-xl p-4">
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Add a new todo..."
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="input-glass flex-1 px-4 py-2.5 rounded-lg text-sm"
        />
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="px-3 py-2.5 text-text-muted hover:text-accent rounded-lg transition-colors text-sm"
          title="More options"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`h-5 w-5 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
        <button
          type="submit"
          disabled={!title.trim() || submitting}
          className="btn-accent px-5 py-2.5 rounded-lg text-sm"
        >
          {submitting ? 'Adding...' : 'Add'}
        </button>
      </div>

      {expanded && (
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <div className="sm:col-span-3">
            <textarea
              placeholder="Description (optional)"
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              className="input-glass w-full px-4 py-2 rounded-lg text-sm resize-none"
            />
          </div>
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
      )}
    </form>
  );
}
