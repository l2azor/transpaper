import type { FilterStatus } from '../types';

interface Props {
  filter: FilterStatus;
  hasSearch: boolean;
}

export function EmptyState({ filter, hasSearch }: Props) {
  if (hasSearch) {
    return (
      <div className="text-center py-12">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-text-muted/50 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <p className="text-text-secondary text-sm">No matching todos found</p>
        <p className="text-text-muted text-xs mt-1">Try a different search term</p>
      </div>
    );
  }

  if (filter === 'completed') {
    return (
      <div className="text-center py-12">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-text-muted/50 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-text-secondary text-sm">No completed todos yet</p>
      </div>
    );
  }

  if (filter === 'active') {
    return (
      <div className="text-center py-12">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-accent/40 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
        </svg>
        <p className="text-text-secondary text-sm">All done! No active todos</p>
      </div>
    );
  }

  return (
    <div className="text-center py-12">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-text-muted/50 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
      <p className="text-text-secondary text-sm">No todos yet</p>
      <p className="text-text-muted text-xs mt-1">Add your first todo above</p>
    </div>
  );
}
