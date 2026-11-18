import React, { useEffect, useState } from 'react';
import { Menu, X, User, Shield, LogOut } from 'lucide-react';
import { ExpertEduLogo } from '@/components/brand/ExpertEduLogo';
import { MAIN_NAVIGATION } from '@/config/navigation';
import {
  getStoredSession,
  logoutCustomer,
  saveStoredSession,
  type CorporateUser,
} from '@/services/api';

interface SiteHeaderProps {
  currentPath: string;
}

export const SiteHeader: React.FC<SiteHeaderProps> = ({ currentPath }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sessionUser, setSessionUser] = useState<CorporateUser | null>(null);

  useEffect(() => {
    const syncSession = () => {
      setSessionUser(getStoredSession()?.user ?? null);
    };
    syncSession();
    window.addEventListener('expertedu-auth-change', syncSession);
    window.addEventListener('storage', syncSession);
    return () => {
      window.removeEventListener('expertedu-auth-change', syncSession);
      window.removeEventListener('storage', syncSession);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await logoutCustomer();
    } catch {
      /* ignore */
    }
    saveStoredSession(null);
    setMobileOpen(false);
    window.location.assign('/');
  };

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

        <div className="hidden items-center gap-2 lg:flex">
          {sessionUser ? (
            <>
              {sessionUser.is_superadmin && (
                <a
                  href="/superadmin"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900 hover:bg-amber-100"
                >
                  <Shield className="h-3.5 w-3.5" aria-hidden="true" />
                  Superadmin
                </a>
              )}
              <a
                href="/mi-cuenta"
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand-primary px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-brand-primary-hover"
              >
                <User className="h-3.5 w-3.5" aria-hidden="true" />
                {sessionUser.username}
              </a>
              <button
                type="button"
                onClick={handleLogout}
                aria-label="Cerrar sesión"
                className="inline-flex items-center gap-1 rounded-lg border border-brand-border px-2.5 py-2 text-xs font-medium text-brand-slate hover:bg-slate-100"
              >
                <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </>
          ) : (
            <>
              <a
                href="/login"
                className="rounded-lg border border-brand-border px-3.5 py-2 text-xs font-semibold text-brand-graphite hover:bg-slate-100"
              >
                Iniciar sesión
              </a>
              <a
                href="/registro"
                className="rounded-lg bg-brand-primary px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-brand-primary-hover"
              >
                Registrarse
              </a>
            </>
          )}
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
              {sessionUser ? (
                <>
                  <a
                    href="/mi-cuenta"
                    onClick={() => setMobileOpen(false)}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-primary px-4 py-3 text-sm font-semibold text-white hover:bg-brand-primary-hover"
                  >
                    <User className="h-4 w-4" aria-hidden="true" />
                    Mi cuenta ({sessionUser.username})
                  </a>
                  {sessionUser.is_superadmin && (
                    <a
                      href="/superadmin"
                      onClick={() => setMobileOpen(false)}
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-900"
                    >
                      <Shield className="h-4 w-4" aria-hidden="true" />
                      Panel Superadmin
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-brand-border px-4 py-2.5 text-sm font-medium text-brand-slate hover:bg-slate-50"
                  >
                    Cerrar sesión
                  </button>
                </>
              ) : (
                <>
                  <a
                    href="/registro"
                    onClick={() => setMobileOpen(false)}
                    className="inline-flex items-center justify-center rounded-lg bg-brand-primary px-4 py-3 text-sm font-semibold text-white hover:bg-brand-primary-hover"
                  >
                    Registrarse
                  </a>
                  <a
                    href="/login"
                    onClick={() => setMobileOpen(false)}
                    className="inline-flex items-center justify-center rounded-lg border border-brand-border px-4 py-2.5 text-sm font-medium text-brand-graphite hover:bg-slate-50"
                  >
                    Iniciar sesión
                  </a>
                </>
              )}
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
