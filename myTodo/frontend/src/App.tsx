import { useTodos } from './hooks/useTodos';
import { TodoForm } from './components/TodoForm';
import { TodoItem } from './components/TodoItem';
import { FilterBar } from './components/FilterBar';
import { EmptyState } from './components/EmptyState';

function App() {
  const {
    todos,
    allTodos,
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
    refetch,
  } = useTodos();

  const counts = {
    all: allTodos.length,
    active: allTodos.filter(t => !t.completed).length,
    completed: allTodos.filter(t => t.completed).length,
  };

  return (
    <div className="min-h-screen">
      <div className="max-w-xl mx-auto px-4 py-16">
        <header className="mb-10">
          <h1 className="text-4xl font-bold tracking-tight font-[family-name:var(--font-display)] text-text-primary">
            My Todo
          </h1>
          <p className="text-sm text-text-secondary mt-2">
            <span className="text-accent font-medium">{counts.active}</span> active,{' '}
            <span className="text-accent font-medium">{counts.completed}</span> completed
          </p>
        </header>

        <div className="space-y-4">
          <TodoForm onSubmit={addTodo} />

          <FilterBar
            filter={filter}
            search={search}
            onFilterChange={setFilter}
            onSearchChange={setSearch}
            counts={counts}
          />

          {error && (
            <div className="glass-card rounded-xl p-4 flex items-center justify-between border-rose-500/30">
              <p className="text-rose-600 text-sm">{error}</p>
              <button
                onClick={refetch}
                className="text-sm text-rose-600 hover:text-rose-500 font-medium underline"
              >
                Retry
              </button>
            </div>
          )}

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              <p className="text-text-muted text-sm mt-3">Loading todos...</p>
            </div>
          ) : todos.length === 0 ? (
            <EmptyState filter={filter} hasSearch={!!search} />
          ) : (
            <div className="space-y-2">
              {todos.map((todo, index) => (
                <div
                  key={todo.id}
                  className="animate-enter"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <TodoItem
                    todo={todo}
                    onUpdate={updateTodo}
                    onDelete={deleteTodo}
                    onToggle={toggleTodo}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
