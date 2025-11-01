import React from 'react';
import { Card, Title, Text, DonutChart } from '@tremor/react';

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

export interface DonutChartCardProps<T extends Record<string, any> = Record<string, any>> {
  title: string;
  subtitle?: string;
  data: T[];
  category: keyof T | string;
  index: keyof T | string;
  colors?: TremorColor[];
  valueFormatter?: (value: number) => string;
  showLabel?: boolean;
  showAnimation?: boolean;
  loading?: boolean;
  className?: string;
  chartClassName?: string;
  noDataMessage?: string;
}

/**
 * DonutChartCard
 * Reusable card wrapper for Tremor DonutChart with common defaults and loading/empty states.
 *
 * Example:
 * <DonutChartCard
 *   title="Error Distribution"
 *   subtitle="Server and client error breakdown"
 *   data={[{ name: '5xx', value: 123 }, { name: '4xx', value: 456 }]}
 *   category="value"
 *   index="name"
 *   colors={['rose', 'amber']}
 *   valueFormatter={(v) => v.toLocaleString()}
 *   showLabel
 * />
 */
export default function DonutChartCard<T extends Record<string, any>>({
  title,
  subtitle,
  data,
  category,
  index,
  colors = ['blue', 'violet', 'emerald', 'amber', 'rose'],
  valueFormatter = (v: number) => `${v}`,
  showLabel = true,
  showAnimation = true,
  loading = false,
  className,
  chartClassName = 'mt-6 h-80',
  noDataMessage = 'No data available for the selected range.',
}: DonutChartCardProps<T>) {
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
        <DonutChart
          className={chartClassName}
          data={data}
          category={category as string}
          index={index as string}
          colors={colors}
          valueFormatter={valueFormatter}
          showLabel={showLabel}
          showAnimation={showAnimation}
        />
      ) : (
        <div className={`${chartClassName} flex items-center justify-center`}>
          <Text className="text-gray-500">{noDataMessage}</Text>
        </div>
      )}
    </Card>
  );
}
