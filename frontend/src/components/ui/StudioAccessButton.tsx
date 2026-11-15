import React from 'react';
import { ArrowRight, ExternalLink } from 'lucide-react';
import { EXPERTEDU_STUDIO_URL, hasConfiguredStudioUrl } from '@/config/site';

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

  const baseStyles =
    'inline-flex items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold transition-colors';
  const variantStyles = {
    primary: 'bg-brand-primary text-white hover:bg-brand-primary-hover shadow-xs',
    secondary: 'bg-brand-graphite text-white hover:bg-slate-800',
    outline:
      'border border-brand-border bg-white text-brand-graphite hover:bg-slate-50',
  }[variant];

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
