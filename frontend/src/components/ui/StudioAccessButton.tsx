import React, { useEffect, useState } from 'react';
import { ArrowRight, ExternalLink } from 'lucide-react';
import { EXPERTEDU_STUDIO_URL, hasConfiguredStudioUrl } from '@/config/site';
import { getStoredSession, launchStudioSso } from '@/services/api';

interface StudioAccessButtonProps {
  variant?: 'primary' | 'secondary' | 'outline';
  className?: string;
  configuredLabel?: string;
  fallbackLabel?: string;
}

export const StudioAccessButton: React.FC<StudioAccessButtonProps> = ({
  variant = 'primary',
  className = '',
  configuredLabel = 'Ver web demo',
  fallbackLabel = 'Solicitar demostración',
}) => {
  const configured = hasConfiguredStudioUrl();
  const [hasSession, setHasSession] = useState(false);
  const [isSuperadmin, setIsSuperadmin] = useState(false);
  const [launching, setLaunching] = useState(false);

  useEffect(() => {
    const sync = () => {
      const sess = getStoredSession();
      setHasSession(Boolean(sess));
      setIsSuperadmin(Boolean(sess?.user?.is_superadmin));
    };
    sync();
    window.addEventListener('expertedu-auth-change', sync);
    return () => window.removeEventListener('expertedu-auth-change', sync);
  }, []);

  const baseStyles =
    'inline-flex items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold transition-colors';
  const variantStyles = {
    primary: 'bg-brand-primary text-white hover:bg-brand-primary-hover shadow-xs',
    secondary: 'bg-brand-graphite text-white hover:bg-slate-800',
    outline:
      'border border-brand-border bg-white text-brand-graphite hover:bg-slate-50',
  }[variant];

  if (hasSession && isSuperadmin) {
    return (
      <button
        type="button"
        disabled={launching}
        onClick={async () => {
          setLaunching(true);
          try {
            const res = await launchStudioSso();
            window.location.assign(res.data.sso_url);
          } catch {
            window.location.assign('/mi-cuenta');
          } finally {
            setLaunching(false);
          }
        }}
        className={`${baseStyles} ${variantStyles} ${className} disabled:opacity-60`}
      >
        {launching ? 'Ingresando a Studio...' : 'Ir directo a ExpertEdu Studio (Admin)'}
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </button>
    );
  }

  if (hasSession) {
    return (
      <a
        href="/mi-cuenta?producto=expertedu-studio"
        className={`${baseStyles} ${variantStyles} ${className}`}
      >
        Ir a ExpertEdu Studio
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </a>
    );
  }

  if (configured) {
    return (
      <a
        href={EXPERTEDU_STUDIO_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={`${baseStyles} ${variantStyles} ${className}`}
      >
        {configuredLabel}
        <ExternalLink className="h-4 w-4" aria-hidden="true" />
      </a>
    );
  }

  return (
    <a
      href="/contacto?tipo=DEMO"
      className={`${baseStyles} ${variantStyles} ${className}`}
    >
      {fallbackLabel}
      <ArrowRight className="h-4 w-4" aria-hidden="true" />
    </a>
  );
};
