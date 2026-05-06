interface ThemeModeIconProps {
  theme: 'light' | 'dark';
  className?: string;
}

export function ThemeModeIcon({theme, className}: ThemeModeIconProps) {
  if (theme === 'light') {
    return (
      <svg
        aria-hidden="true"
        className={className}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="4.25" />
        <path d="M12 2.75v2.5" />
        <path d="M12 18.75v2.5" />
        <path d="m4.93 4.93 1.77 1.77" />
        <path d="m17.3 17.3 1.77 1.77" />
        <path d="M2.75 12h2.5" />
        <path d="M18.75 12h2.5" />
        <path d="m4.93 19.07 1.77-1.77" />
        <path d="m17.3 6.7 1.77-1.77" />
      </svg>
    );
  }

  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="none"
    >
      <path d="M14.85 3.8a8.7 8.7 0 1 0 5.35 15.71 9.35 9.35 0 0 1-3.61.72 9.48 9.48 0 0 1-9.47-9.47c0-2.9 1.3-5.54 3.34-7.32a8.65 8.65 0 0 0 4.39.36Z" />
    </svg>
  );
}
