import React from 'react';
import { Card, Title, Text, AreaChart } from '@tremor/react';

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

export interface AreaChartCardProps<T extends Record<string, any> = Record<string, any>> {
  title: string;
  subtitle?: string;
  data: T[];
  categories: string[];
  index: keyof T | string;
  colors?: TremorColor[];
  valueFormatter?: (value: number) => string;
  showLegend?: boolean;
  showAnimation?: boolean;
  yAxisWidth?: number;
  autoMinValue?: boolean;
  minValue?: number;
  maxValue?: number;
  loading?: boolean;
  className?: string;
  chartClassName?: string;
  noDataMessage?: string;
}

/**
 * AreaChartCard
 * Reusable card wrapper for Tremor AreaChart with common defaults and loading/empty states.
 *
 * Example:
 * <AreaChartCard
 *   title="Event Volume"
 *   subtitle="Total events processed over time"
 *   data={data}
 *   categories={['event_count']}
 *   index="minute"
 *   colors={['blue']}
 *   valueFormatter={(v) => v.toLocaleString()}
 * />
 */
export default function AreaChartCard<T extends Record<string, any>>({
  title,
  subtitle,
  data,
  categories,
  index,
  colors = ['blue'],
  valueFormatter = (v: number) => `${v}`,
  showLegend = true,
  showAnimation = true,
  yAxisWidth,
  autoMinValue,
  minValue,
  maxValue,
  loading = false,
  className,
  chartClassName = 'mt-6 h-80',
  noDataMessage = 'No data available for the selected range.',
}: AreaChartCardProps<T>) {
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
        <AreaChart
          className={chartClassName}
          data={data}
          categories={categories}
          index={index as string}
          colors={colors}
          valueFormatter={valueFormatter}
          showLegend={showLegend}
          showAnimation={showAnimation}
          yAxisWidth={yAxisWidth}
          autoMinValue={autoMinValue}
          minValue={minValue}
          maxValue={maxValue}
        />
      ) : (
        <div className={`${chartClassName} flex items-center justify-center`}>
          <Text className="text-gray-500">{noDataMessage}</Text>
        </div>
      )}
    </Card>
  );
}
