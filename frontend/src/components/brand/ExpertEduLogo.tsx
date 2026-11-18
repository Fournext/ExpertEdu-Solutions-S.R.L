import React from 'react';

export type LogoVariant = 'horizontal' | 'isotipo' | 'mono' | 'dark';

interface ExpertEduLogoProps {
  variant?: LogoVariant;
  className?: string;
  showTagline?: boolean;
}

export const ExpertEduLogo: React.FC<ExpertEduLogoProps> = ({
  variant = 'horizontal',
  className = '',
  showTagline = false,
}) => {
  const isDark = variant === 'dark';
  const isMono = variant === 'mono';

  const bgFill = isMono ? '#1C1917' : isDark ? '#0F766E' : '#0F766E';
  const accentStroke = isMono ? '#FFFFFF' : '#14B8A6';
  const textColor = isDark ? 'text-white' : 'text-brand-graphite';
  const subTextColor = isDark ? 'text-stone-300' : 'text-brand-muted';

  const mark = (
    <svg
      width="36"
      height="36"
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="shrink-0"
    >
      <rect width="40" height="40" rx="10" fill={bgFill} />
      <path
        d="M12 13L21 20L12 27"
        stroke="#FFFFFF"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M21 20H29"
        stroke={accentStroke}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <circle cx="12" cy="13" r="2.75" fill="#FFFFFF" />
      <circle cx="12" cy="27" r="2.75" fill="#FFFFFF" />
      <circle cx="21" cy="20" r="3" fill={accentStroke} />
      <circle cx="29" cy="20" r="2.75" fill="#FFFFFF" />
    </svg>
  );

  if (variant === 'isotipo') {
    return <span className={`inline-flex items-center ${className}`}>{mark}</span>;
  }

  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      {mark}
      <span className="flex flex-col leading-none">
        <span className={`font-display text-lg font-bold tracking-tight ${textColor}`}>
          Expert<span className={isDark ? 'text-emerald-400' : 'text-brand-primary'}>Edu</span>
        </span>
        {showTagline && (
          <span className={`mt-0.5 text-[11px] font-medium ${subTextColor}`}>
            Solutions S.R.L.
          </span>
        )}
      </span>
    </span>
  );
};
