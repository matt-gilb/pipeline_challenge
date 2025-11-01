/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Shared number and unit formatters for tooltips and axes.
 *
 * These helpers are safe to use in charts (valueFormatter/axis tick formatters),
 * badges, cards, and tables. They are locale-aware via Intl and provide compact
 * formatting options where applicable.
 */

export type Formatter = (value: number | null | undefined) => string;

export type NumberCompactOptions = {
  decimals?: number; // number of fraction digits (default: 1)
  locale?: string; // BCP 47 language tag (default: 'en-US')
};

export type PercentOptions = {
  // If true, treat input value as a fraction in [0, 1] and convert to percent.
  // If false, treat input as already a percentage in [0, 100].
  fraction?: boolean; // default: auto (<= 1 -> fraction else percentage)
  decimals?: number; // default: 1
  locale?: string; // default: 'en-US'
  trailingSpace?: boolean; // default: true ('25 %' vs '25%')
};

export type CurrencyOptions = {
  currency?: string; // ISO 4217 code (default: 'USD')
  compact?: boolean; // use compact notation (e.g., $1.2K)
  decimals?: number; // fraction digits override
  locale?: string; // default: 'en-US'
};

export type BytesOptions = {
  decimals?: number; // default: 1
  locale?: string; // default: 'en-US'
};

export type MillisecondsOptions = {
  // Strategy:
  // - 'short': 123ms, 1.2s, 1.5m
  // - 'long': 123 ms, 1.2 s, 1.5 min
  style?: 'short' | 'long'; // default: 'short'
  decimals?: number; // default: 1 for seconds/minutes
  locale?: string; // default: 'en-US' (for decimal separator)
};

export type DateTimeOptions = {
  locale?: string; // default: 'en-US'
  /**
   * Intl.DateTimeFormatOptions override. By default we show:
   * 'MMM dd, HH:mm:ss' in the user's locale.
   */
  formatOptions?: Intl.DateTimeFormatOptions;
};

const DEFAULT_LOCALE = 'en-US';

function isNil(val: unknown): val is null | undefined {
  return val === null || val === undefined || (typeof val === 'number' && Number.isNaN(val));
}

function clampDecimals(decimals: number | undefined, fallback: number) {
  const d = typeof decimals === 'number' && decimals >= 0 && decimals <= 20 ? decimals : fallback;
  return d;
}

/**
 * Format a number with "short" suffixes (K, M, B, T).
 * Example: 1234 -> "1.2K", 1500000 -> "1.5M"
 */
export function formatNumberShort(
  value: number | null | undefined,
  options: NumberCompactOptions = {}
): string {
  if (isNil(value)) return '–';
  const { decimals = 1, locale = DEFAULT_LOCALE } = options;

  const abs = Math.abs(value);
  const units = [
    { v: 1e12, s: 'T' },
    { v: 1e9, s: 'B' },
    { v: 1e6, s: 'M' },
    { v: 1e3, s: 'K' }
  ];

  const nf = new Intl.NumberFormat(locale, {
    minimumFractionDigits: clampDecimals(decimals, 1),
    maximumFractionDigits: clampDecimals(decimals, 1)
  });

  for (const u of units) {
    if (abs >= u.v) {
      return `${nf.format(value / u.v)}${u.s}`;
    }
  }
  // Small numbers -> show as-is with grouping, no decimals by default
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: Math.floor(value) === value ? 0 : clampDecimals(decimals, 1)
  }).format(value);
}

/**
 * Format a percentage, intelligently handling fractions vs. percentages.
 * - If fraction is true (or value <= 1), treat as [0, 1] and scale by 100.
 * - Otherwise, treat as already a percentage.
 */
export function formatPercent(
  value: number | null | undefined,
  options: PercentOptions = {}
): string {
  if (isNil(value)) return '–';
  const { decimals = 1, locale = DEFAULT_LOCALE, trailingSpace = true } = options;

  const isFraction = typeof options.fraction === 'boolean' ? options.fraction : value <= 1;
  const percentValue = isFraction ? value * 100 : value;

  const formatted = new Intl.NumberFormat(locale, {
    style: 'decimal',
    minimumFractionDigits: clampDecimals(decimals, 1),
    maximumFractionDigits: clampDecimals(decimals, 1)
  }).format(percentValue);

  return trailingSpace ? `${formatted} %` : `${formatted}%`;
}

/**
 * Format milliseconds with unit scaling.
 * short: 123ms, 1.2s, 1.5m
 * long: 123 ms, 1.2 s, 1.5 min
 */
export function formatMs(
  value: number | null | undefined,
  options: MillisecondsOptions = {}
): string {
  if (isNil(value)) return '–';
  const { style = 'short', decimals = 1, locale = DEFAULT_LOCALE } = options;

  const abs = Math.abs(value);
  const nf0 = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
  const nf = new Intl.NumberFormat(locale, {
    minimumFractionDigits: clampDecimals(decimals, 1),
    maximumFractionDigits: clampDecimals(decimals, 1)
  });

  if (abs < 1000) {
    return style === 'short' ? `${nf0.format(value)}ms` : `${nf0.format(value)} ms`;
  } else if (abs < 60000) {
    const s = value / 1000;
    return style === 'short' ? `${nf.format(s)}s` : `${nf.format(s)} s`;
  } else {
    const m = value / 60000;
    return style === 'short' ? `${nf.format(m)}m` : `${nf.format(m)} min`;
  }
}

/**
 * Format bytes using IEC units (KiB, MiB, GiB) but with decimal-friendly names (KB, MB, GB).
 */
export function formatBytes(
  value: number | null | undefined,
  options: BytesOptions = {}
): string {
  if (isNil(value)) return '–';
  const { decimals = 1, locale = DEFAULT_LOCALE } = options;

  const abs = Math.abs(value);
  const nf = new Intl.NumberFormat(locale, {
    minimumFractionDigits: clampDecimals(decimals, 1),
    maximumFractionDigits: clampDecimals(decimals, 1)
  });

  if (abs < 1024) return `${value} B`;
  const units = ['KB', 'MB', 'GB', 'TB', 'PB'];
  let u = -1;
  let n = value;
  do {
    n /= 1024;
    u++;
  } while (Math.abs(n) >= 1024 && u < units.length - 1);

  return `${nf.format(n)} ${units[u]}`;
}

/**
 * Format currency with optional compact notation.
 */
export function formatCurrency(
  value: number | null | undefined,
  options: CurrencyOptions = {}
): string {
  if (isNil(value)) return '–';
  const { currency = 'USD', compact = false, decimals, locale = DEFAULT_LOCALE } = options;

  const intlOptions: Intl.NumberFormatOptions = {
    style: 'currency',
    currency,
    notation: compact ? 'compact' : 'standard'
  };

  if (typeof decimals === 'number') {
    intlOptions.minimumFractionDigits = clampDecimals(decimals, 0);
    intlOptions.maximumFractionDigits = clampDecimals(decimals, 2);
  }

  return new Intl.NumberFormat(locale, intlOptions).format(value);
}

/**
 * Format a generic number with grouping and optional fixed decimals.
 */
export function formatNumber(
  value: number | null | undefined,
  options: { decimals?: number; locale?: string } = {}
): string {
  if (isNil(value)) return '–';
  const { decimals, locale = DEFAULT_LOCALE } = options;

  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: typeof decimals === 'number' ? clampDecimals(decimals, decimals) : 0,
    maximumFractionDigits: typeof decimals === 'number' ? clampDecimals(decimals, decimals) : 3
  }).format(value);
}

/**
 * Format date/time for tooltips and legends using Intl.
 * Default format: 'MMM dd, HH:mm:ss' in the given locale.
 */
export function formatDateTime(
  input: Date | number | string | null | undefined,
  options: DateTimeOptions = {}
): string {
  if (isNil(input)) return '–';
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return '–';

  const { locale = DEFAULT_LOCALE, formatOptions } = options;

  const defaultOptions: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  };

  return new Intl.DateTimeFormat(locale, formatOptions ?? defaultOptions).format(d);
}

/**
 * A factory that returns a formatter function suitable for Tremor chart valueFormatter and axis ticks.
 */
export type FormatterKind =
  | 'number'
  | 'short'
  | 'percent'
  | 'ms'
  | 'bytes'
  | 'currency';

export type FormatterFactoryOptions =
  | ({ kind: 'number' | 'short' } & NumberCompactOptions)
  | ({ kind: 'percent' } & PercentOptions)
  | ({ kind: 'ms' } & MillisecondsOptions)
  | ({ kind: 'bytes' } & BytesOptions)
  | ({ kind: 'currency' } & CurrencyOptions);

export function makeNumberFormatter(opts: FormatterFactoryOptions): Formatter {
  switch (opts.kind) {
    case 'number':
      return (v) => formatNumber(v, { decimals: (opts as any).decimals, locale: (opts as any).locale });
    case 'short':
      return (v) => formatNumberShort(v, { decimals: (opts as any).decimals, locale: (opts as any).locale });
    case 'percent':
      return (v) => formatPercent(v, {
        fraction: (opts as any).fraction,
        decimals: (opts as any).decimals,
        locale: (opts as any).locale,
        trailingSpace: (opts as any).trailingSpace
      });
    case 'ms':
      return (v) => formatMs(v, {
        style: (opts as any).style,
        decimals: (opts as any).decimals,
        locale: (opts as any).locale
      });
    case 'bytes':
      return (v) => formatBytes(v, { decimals: (opts as any).decimals, locale: (opts as any).locale });
    case 'currency':
      return (v) => formatCurrency(v, {
        currency: (opts as any).currency,
        compact: (opts as any).compact,
        decimals: (opts as any).decimals,
        locale: (opts as any).locale
      });
    default:
      return (v) => formatNumber(v);
  }
}

/**
 * Small helper to wrap a value with a label for tooltip content composition.
 * Example usage:
 *  tooltipItems.map(({ name, value }) => formatTooltipKV(name, value, formatters[name]));
 */
export function formatTooltipKV(
  label: string,
  value: number | null | undefined,
  formatter: Formatter = (v) => formatNumber(v)
): { label: string; value: string } {
  return { label, value: formatter(value) };
}
