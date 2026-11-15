import React, { useMemo, useState } from 'react';
import { Search, BookOpen, ArrowRight } from 'lucide-react';

export interface ResourceSummary {
  slug: string;
  title: string;
  description: string;
  category: 'Artículos' | 'Tutoriales' | 'Guías';
  publishedAt: string;
  readingTime: string;
}

interface ResourcesExplorerProps {
  resources: ResourceSummary[];
}

const CATEGORIES: Array<'Todos' | ResourceSummary['category']> = [
  'Todos',
  'Artículos',
  'Tutoriales',
  'Guías',
];

export const ResourcesExplorer: React.FC<ResourcesExplorerProps> = ({ resources }) => {
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] =
    useState<(typeof CATEGORIES)[number]>('Todos');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return resources.filter((item) => {
      const matchesCat =
        selectedCategory === 'Todos' || item.category === selectedCategory;
      const matchesQuery =
        !q ||
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q);
      return matchesCat && matchesQuery;
    });
  }, [resources, query, selectedCategory]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 rounded-2xl border border-brand-border bg-brand-surface p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search
            className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-brand-muted"
            aria-hidden="true"
          />
          <label htmlFor="resource-search" className="sr-only">
            Buscar recursos
          </label>
          <input
            id="resource-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar artículos, guías o tutoriales..."
            className="w-full rounded-lg border border-brand-border bg-white py-2.5 pr-4 pl-10 text-sm text-brand-graphite placeholder:text-slate-400 focus:border-brand-primary focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por categoría">
          {CATEGORIES.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => setSelectedCategory(category)}
              aria-pressed={selectedCategory === category}
              className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors ${
                selectedCategory === category
                  ? 'bg-brand-primary text-white'
                  : 'border border-brand-border bg-white text-brand-slate hover:bg-slate-50'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-brand-border bg-white p-10 text-center">
          <BookOpen className="mx-auto h-8 w-8 text-brand-muted" aria-hidden="true" />
          <p className="mt-3 font-display text-base font-semibold text-brand-graphite">
            No se encontraron recursos para tu búsqueda
          </p>
          <p className="mt-1 text-sm text-brand-slate">
            Prueba con otro término o selecciona la categoría «Todos».
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => (
            <article
              key={item.slug}
              className="flex flex-col justify-between rounded-2xl border border-brand-border bg-white p-6 transition-shadow hover:shadow-md"
            >
              <div>
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="rounded-md bg-brand-primary-light/60 px-2.5 py-1 font-semibold text-brand-primary">
                    {item.category}
                  </span>
                  <span className="text-brand-muted">{item.readingTime}</span>
                </div>
                <h3 className="mt-4 font-display text-lg font-bold text-brand-graphite">
                  <a href={`/recursos/${item.slug}`} className="hover:text-brand-primary">
                    {item.title}
                  </a>
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-brand-slate">
                  {item.description}
                </p>
              </div>
              <div className="mt-6 flex items-center justify-between border-t border-brand-border pt-4 text-xs">
                <time dateTime={item.publishedAt} className="text-brand-muted">
                  {item.publishedAt}
                </time>
                <a
                  href={`/recursos/${item.slug}`}
                  className="inline-flex items-center gap-1 font-semibold text-brand-primary hover:underline"
                >
                  Leer recurso
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </a>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};
