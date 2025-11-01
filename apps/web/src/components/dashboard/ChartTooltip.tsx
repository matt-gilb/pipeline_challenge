'use client';

import React from 'react';
import type { TooltipProps } from 'recharts';
import { formatNumber, formatDateTime } from '@/lib/format';

export type Formatter = (value: number | null | undefined) => string;

export type ChartTooltipItem = {
  name: string;
  value: number | null | undefined;
  color?: string;
  formatter?: Formatter;
};

export type ChartTooltipProps = {
  label?: string;
  items: ChartTooltipItem[];
  showTotal?: boolean;
  totalLabel?: string;
  className?: string;
  // Optional header formatter if the label is a timestamp or needs localization
  labelFormatter?: (label: any) => string;
};

function formatValue(value: number | null | undefined, formatter?: Formatter): string {
  if (typeof formatter === 'function') {
    return formatter(value);
  }
  return formatNumber(value);
}

/**
 * ChartTooltip
 *
 * Reusable custom tooltip content for Tremor charts.
 * Intended to be used via `customTooltip={(props) => <ChartTooltip ... />}` or through
 * the provided adapter factory `makeTremorTooltip(...)`.
 */
export default function ChartTooltip({
  label,
  items,
  showTotal = false,
  totalLabel = 'Total',
  className,
  labelFormatter,
}: ChartTooltipProps) {
  const total = showTotal
    ? items.reduce((sum, it) => sum + (typeof it.value === 'number' ? it.value : 0), 0)
    : null;

  const header =
    typeof labelFormatter === 'function'
      ? labelFormatter(label)
      : typeof label === 'string' || typeof label === 'number'
        ? String(label)
        : '';

  return (
    <div
      className={[
        // Container
        'rounded-md border border-gray-200 bg-white shadow-sm',
        // Dark mode
        'dark:border-gray-700 dark:bg-gray-900',
        // Spacing
        'px-3 py-2',
        className || '',
      ].join(' ')}
      role="tooltip"
    >
      {header ? (
        <div className="mb-1.5 text-xs font-medium text-gray-700 dark:text-gray-300">{header}</div>
      ) : null}

      <div className="space-y-1">
        {items.map((it) => (
          <div key={it.name} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              {it.color ? (
                <span
                  className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm"
                  style={{ backgroundColor: it.color }}
                  aria-hidden
                />
              ) : null}
              <span className="truncate text-xs text-gray-600 dark:text-gray-400">{it.name}</span>
            </div>
            <span className="text-xs font-medium text-gray-900 dark:text-gray-100">
              {formatValue(it.value, it.formatter)}
            </span>
          </div>
        ))}
      </div>

      {showTotal ? (
        <div className="mt-2 border-t border-gray-200 pt-1.5 dark:border-gray-700">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
              {totalLabel}
            </span>
            <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">
              {formatValue(total, undefined)}
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/**
 * makeTremorTooltip
 *
 * Adapter factory that returns a function compatible with Tremor's `customTooltip` prop.
 * Pass a map of value formatters keyed by category (dataKey), and an optional label formatter.
 *
 * Usage:
 * <AreaChart
 *   ...
 *   customTooltip={makeTremorTooltip(
 *     { event_count: formatNumberShort },
 *     (label) => formatDateTime(label) // if label is a timestamp
 *   )}
 * />
 */
export function makeTremorTooltip(
  valueFormatterMap?: Record<string, Formatter>,
  labelFormatter?: (label: any) => string,
  options?: { showTotal?: boolean; totalLabel?: string }
) {
  const { showTotal = false, totalLabel = 'Total' } = options || {};

  // Recharts tooltip props are passed through Tremor to this function
  return function TremorTooltipAdapter(props: any) {
    const { active, payload, label } = props;

    if (!active || !payload || !payload.length) return null;

    // Build item list from Recharts payload
    const items: ChartTooltipItem[] = payload.filter(Boolean).map((p: any) => {
      // p.name is the series label; p.dataKey is the category key
      const name: string = p?.name ?? p?.dataKey ?? 'value';
      // For stacked/area charts value may be a number, ensure proper extraction
      const rawVal = Array.isArray(p?.value) ? p.value[1] : p?.value;
      const value: number | null | undefined =
        typeof rawVal === 'number' ? rawVal : Number.isFinite(rawVal) ? Number(rawVal) : null;
      const color: string | undefined = p?.color;
      const dataKey: string = p?.dataKey ?? name;
      const formatter = valueFormatterMap?.[dataKey] ?? valueFormatterMap?.[name];

      return { name, value, color, formatter };
    });

    // Attempt to format time-like labels nicely if no custom formatter is provided
    const defaultLabelFormatter = (lbl: any) => {
      // Try to detect ISO string or timestamp
      if (typeof lbl === 'number' || (typeof lbl === 'string' && !Number.isNaN(Date.parse(lbl)))) {
        return formatDateTime(lbl);
      }
      return String(lbl ?? '');
    };

    const header = labelFormatter ? labelFormatter(label) : defaultLabelFormatter(label);

    return (
      <ChartTooltip label={header} items={items} showTotal={showTotal} totalLabel={totalLabel} />
    );
  };
}
