'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { MoonIcon, SunIcon } from '@heroicons/react/24/outline';

type Size = 'sm' | 'md' | 'lg';

export interface ThemeToggleProps {
  className?: string;
  size?: Size;
  // If true, renders a minimal icon-only button (default true)
  iconOnly?: boolean;
  // Optional labels for accessibility
  labelLight?: string;
  labelDark?: string;
}

/**
 * ThemeToggle
 *
 * A client-side toggle that switches between light and dark mode.
 * Must be rendered inside a ThemeProvider (attribute="class") from next-themes.
 *
 * Usage:
 * <ThemeToggle />
 */
export default function ThemeToggle({
  className,
  size = 'md',
  iconOnly = true,
  labelLight = 'Switch to light mode',
  labelDark = 'Switch to dark mode',
}: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatches by only rendering icons after mount
  useEffect(() => setMounted(true), []);

  const isDark = resolvedTheme === 'dark';

  const sizes: Record<Size, { button: string; icon: string; gap: string; text: string }> = {
    sm: { button: 'p-1.5 rounded-md', icon: 'h-4 w-4', gap: 'gap-1.5', text: 'text-xs' },
    md: { button: 'p-2 rounded-md', icon: 'h-5 w-5', gap: 'gap-2', text: 'text-sm' },
    lg: { button: 'p-2.5 rounded-lg', icon: 'h-6 w-6', gap: 'gap-2.5', text: 'text-base' },
  };

  const { button, icon, gap, text } = sizes[size];

  const handleClick = () => {
    setTheme(isDark ? 'light' : 'dark');
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={isDark ? labelLight : labelDark}
      title={isDark ? labelLight : labelDark}
      className={[
        'inline-flex items-center',
        button,
        gap,
        // Base colors
        'text-gray-600 hover:text-gray-900 hover:bg-gray-50',
        // Dark colors
        'dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-800',
        'transition-colors',
        className || '',
      ].join(' ')}
    >
      {mounted ? (
        isDark ? (
          <SunIcon className={icon} />
        ) : (
          <MoonIcon className={icon} />
        )
      ) : (
        // Placeholder to preserve layout before hydration
        <span className={icon} />
      )}
      {!iconOnly && (
        <span className={text}>{isDark ? 'Light' : 'Dark'}</span>
      )}
    </button>
  );
}
