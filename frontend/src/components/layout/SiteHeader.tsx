import React, { useEffect, useState } from 'react';
import { Menu, X, ArrowRight } from 'lucide-react';
import { ExpertEduLogo } from '@/components/brand/ExpertEduLogo';
import { MAIN_NAVIGATION } from '@/config/navigation';

interface SiteHeaderProps {
  currentPath: string;
}

export const SiteHeader: React.FC<SiteHeaderProps> = ({ currentPath }) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string): boolean => {
    if (href === '/') return currentPath === '/';
    return currentPath === href || currentPath.startsWith(`${href}/`);
  };

  useEffect(() => {
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-brand-border bg-white/95 backdrop-blur-sm">
      <div className="container-corp flex h-18 items-center justify-between gap-4">
        <a
          href="/"
          className="rounded-lg py-1 focus-visible:outline-2 focus-visible:outline-brand-primary"
          aria-label="ExpertEdu — Ir a la página principal"
        >
          <ExpertEduLogo variant="horizontal" />
        </a>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Navegación principal">
          {MAIN_NAVIGATION.map((item) => {
            const active = isActive(item.href);
            return (
              <a
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-brand-primary-light/60 text-brand-primary'
                    : 'text-brand-slate hover:bg-slate-100 hover:text-brand-graphite'
                }`}
              >
                {item.label}
              </a>
            );
          })}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <a
            href="/producto"
            className="inline-flex items-center gap-2 rounded-lg bg-brand-primary px-4 py-2.5 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-brand-primary-hover"
          >
            Conocer ExpertEdu Studio
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </a>
        </div>

        <button
          type="button"
          className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-brand-border text-brand-graphite hover:bg-slate-100 lg:hidden"
          aria-label={mobileOpen ? 'Cerrar menú de navegación' : 'Abrir menú de navegación'}
          aria-expanded={mobileOpen}
          aria-controls="mobile-nav-drawer"
          onClick={() => setMobileOpen((prev) => !prev)}
        >
          {mobileOpen ? (
            <X className="h-5 w-5" aria-hidden="true" />
          ) : (
            <Menu className="h-5 w-5" aria-hidden="true" />
          )}
        </button>
      </div>

      {mobileOpen && (
        <div
          id="mobile-nav-drawer"
          className="border-t border-brand-border bg-white px-5 py-4 lg:hidden"
        >
          <nav className="flex flex-col gap-1" aria-label="Navegación móvil">
            {MAIN_NAVIGATION.map((item) => {
              const active = isActive(item.href);
              return (
                <a
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  onClick={() => setMobileOpen(false)}
                  className={`rounded-lg px-3.5 py-2.5 text-base font-medium transition-colors ${
                    active
                      ? 'bg-brand-primary-light/60 text-brand-primary'
                      : 'text-brand-slate hover:bg-slate-100 hover:text-brand-graphite'
                  }`}
                >
                  {item.label}
                </a>
              );
            })}
            <div className="mt-3 border-t border-brand-border pt-3 flex flex-col gap-2">
              <a
                href="/producto"
                onClick={() => setMobileOpen(false)}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-primary px-4 py-3 text-sm font-semibold text-white hover:bg-brand-primary-hover"
              >
                Conocer ExpertEdu Studio
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </a>
              <a
                href="/soporte"
                onClick={() => setMobileOpen(false)}
                className="inline-flex items-center justify-center rounded-lg border border-brand-border px-4 py-2.5 text-sm font-medium text-brand-slate hover:bg-slate-50"
              >
                Soporte técnico
              </a>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
};
