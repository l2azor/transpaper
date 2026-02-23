import type { FilterStatus } from '../types';

interface Props {
  filter: FilterStatus;
  search: string;
  onFilterChange: (filter: FilterStatus) => void;
  onSearchChange: (search: string) => void;
  counts: { all: number; active: number; completed: number };
}

const filters: { value: FilterStatus; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
];

export function FilterBar({ filter, search, onFilterChange, onSearchChange, counts }: Props) {
  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="relative flex-1">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
        </svg>
        <input
          type="text"
          placeholder="Search todos..."
          value={search}
          onChange={e => onSearchChange(e.target.value)}
          className="input-glass w-full pl-9 pr-4 py-2 rounded-lg text-sm"
        />
        {search && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-accent transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        )}
      </div>
      <div className="flex rounded-lg overflow-hidden border border-border-subtle">
        {filters.map(f => (
          <button
            key={f.value}
            onClick={() => onFilterChange(f.value)}
            className={`px-4 py-2 text-sm font-medium transition-all duration-200 ${
              filter === f.value
                ? 'bg-amber-500 text-black'
                : 'bg-bg-glass text-text-secondary hover:bg-bg-glass-hover'
            }`}
          >
            {f.label}
            <span className={`ml-1.5 text-xs ${filter === f.value ? 'text-black/60' : 'text-text-muted'}`}>
              {counts[f.value]}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
