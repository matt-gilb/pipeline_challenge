import React from 'react';
import { Card, Title, Text, BarChart } from '@tremor/react';

type TremorColor =
  | 'blue'
  | 'emerald'
  | 'violet'
  | 'amber'
  | 'gray'
  | 'cyan'
  | 'pink'
  | 'lime'
  | 'fuchsia'
  | 'rose'
  | 'red'
  | 'orange'
  | 'slate'
  | 'teal'
  | 'indigo'
  | 'purple';

export interface BarChartCardProps<T extends Record<string, any> = Record<string, any>> {
  title: string;
  subtitle?: string;
  data: T[];
  categories: string[];
  index: keyof T | string;
  colors?: TremorColor[];
  valueFormatter?: (value: number) => string;
  stack?: boolean;
  showLegend?: boolean;
  showAnimation?: boolean;
  yAxisWidth?: number;
  loading?: boolean;
  className?: string;
  chartClassName?: string;
  noDataMessage?: string;
}

/**
 * BarChartCard
 * Reusable card wrapper for Tremor BarChart with common defaults and loading/empty states.
 *
 * Example:
 * <BarChartCard
 *   title="Data Quality Issues"
 *   subtitle="Missing fields and duplicate records"
 *   data={data}
 *   categories={['missing_ip', 'missing_user']}
 *   index="minute"
 *   colors={['amber', 'rose']}
 *   stack
 *   valueFormatter={(v) => v.toLocaleString()}
 * />
 */
export default function BarChartCard<T extends Record<string, any>>({
  title,
  subtitle,
  data,
  categories,
  index,
  colors = ['blue'],
  valueFormatter = (v: number) => `${v}`,
  stack = false,
  showLegend = true,
  showAnimation = true,
  yAxisWidth,
  loading = false,
  className,
  chartClassName = 'mt-6 h-80',
  noDataMessage = 'No data available for the selected range.',
}: BarChartCardProps<T>) {
  return (
    <Card className={className}>
      <Title>{title}</Title>
      {subtitle ? <Text>{subtitle}</Text> : null}

      {/* Loading state */}
      {loading ? (
        <div className="mt-6">
          <div className="h-4 w-40 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
          <div className="mt-2 h-4 w-28 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
          <div className={`${chartClassName} mt-6 animate-pulse rounded bg-gray-100 dark:bg-gray-900`} />
        </div>
      ) : data?.length ? (
        <BarChart
          className={chartClassName}
          data={data}
          categories={categories}
          index={index as string}
          colors={colors}
          valueFormatter={valueFormatter}
          stack={stack}
          showLegend={showLegend}
          showAnimation={showAnimation}
          yAxisWidth={yAxisWidth}
        />
      ) : (
        <div className={`${chartClassName} flex items-center justify-center`}>
          <Text className="text-gray-500">{noDataMessage}</Text>
        </div>
      )}
    </Card>
  );
}
