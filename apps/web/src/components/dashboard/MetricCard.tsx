import React from 'react';
import { Card, Text, Metric, Flex, Badge } from '@tremor/react';
import { cx } from '@/lib/utils';

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

export interface MetricCardProps {
  title: string;
  value: string | number | React.ReactNode;
  subtitle?: string;
  icon?: React.ComponentType<{ className?: string }>;
  decorationColor?: TremorColor;
  trendLabel?: string;
  trendColor?: TremorColor;
  loading?: boolean;
  className?: string;
}

/**
 * MetricCard
 * A compact KPI card with optional icon and trend badge.
 *
 * Usage:
 * <MetricCard title="Total Events" value={12345} decorationColor="blue" />
 * <MetricCard title="Login Success" value="98.5%" trendLabel="Healthy" trendColor="emerald" />
 */
export default function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  decorationColor = 'blue',
  trendLabel,
  trendColor = 'gray',
  loading = false,
  className,
}: MetricCardProps) {
  return (
    <Card decoration="top" decorationColor={decorationColor} className={className}>
      <Flex alignItems="start" className="gap-3">
        <div className="min-w-0">
          <Text>{title}</Text>
          {subtitle ? <Text className="mt-0.5 text-gray-500">{subtitle}</Text> : null}
          <div className="mt-1">
            {loading ? (
              <div className="mt-2 h-7 w-28 animate-pulse rounded bg-gray-200 dark:bg-gray-800" />
            ) : (
              <Metric className="truncate">{value}</Metric>
            )}
          </div>
        </div>

        {Icon ? (
          <div
            className={cx(
              'ml-auto flex h-9 w-9 items-center justify-center rounded-md',
              'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
        ) : null}
      </Flex>

      {trendLabel ? (
        <Flex className="mt-2" justifyContent="start">
          <Badge color={trendColor}>{trendLabel}</Badge>
        </Flex>
      ) : null}
    </Card>
  );
}
