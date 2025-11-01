import React from "react";
import { Flex, Select, SelectItem, Button } from "@tremor/react";
import { cx } from "@/lib/utils";

export type TimeRangeOption = {
  label: string;
  value: string;
};

export const DEFAULT_TIME_RANGES: TimeRangeOption[] = [
  { label: "Last 15 Minutes", value: "15 MINUTE" },
  { label: "Last Hour", value: "1 HOUR" },
  { label: "Last 6 Hours", value: "6 HOUR" },
  { label: "Last 24 Hours", value: "24 HOUR" },
];

export interface DashboardFilterBarProps {
  timeRange: string;
  onTimeRangeChange: (value: string) => void;

  timeRanges?: TimeRangeOption[];

  // Optional UI slots
  leftContent?: React.ReactNode;
  rightContent?: React.ReactNode;

  // Optional refresh control
  onRefresh?: () => void;
  refreshing?: boolean;

  // Layout
  sticky?: boolean; // default true
  stickyTopClass?: string; // e.g. 'top-16', default 'top-16'
  className?: string;
}

/**
 * DashboardFilterBar
 *
 * A sticky (by default) toolbar-style filter row for dashboards.
 * It renders a time range select and an optional refresh button,
 * with optional left/right custom content slots.
 *
 * Accessibility: role="toolbar" and grouped controls for screen readers.
 */
export default function DashboardFilterBar({
  timeRange,
  onTimeRangeChange,
  timeRanges = DEFAULT_TIME_RANGES,
  leftContent,
  rightContent,
  onRefresh,
  refreshing = false,
  sticky = true,
  stickyTopClass = "top-16",
  className,
}: DashboardFilterBarProps) {
  return (
    <div
      role="toolbar"
      aria-label="Dashboard filters"
      className={cx(
        sticky ? cx("sticky", stickyTopClass) : "",
        "z-20 flex items-center justify-between border-b border-gray-200 bg-white pb-4 pt-4 sm:pt-6 dark:border-gray-800 dark:bg-gray-950",
        className
      )}
    >
      {/* Left slot (e.g., tags, breadcrumbs, quick summaries) */}
      <div className="min-h-[1px]">{leftContent}</div>

      {/* Right controls */}
      <Flex className="gap-3" justifyContent="end" alignItems="center">
        {rightContent}

        <Select
          value={timeRange}
          onValueChange={onTimeRangeChange}
          aria-label="Time range"
        >
          {timeRanges.map((tr) => (
            <SelectItem key={tr.value} value={tr.value}>
              {tr.label}
            </SelectItem>
          ))}
        </Select>

        {onRefresh ? (
          <Button
            variant="secondary"
            onClick={onRefresh}
            loading={refreshing}
            aria-label="Refresh data"
          >
            Refresh
          </Button>
        ) : null}
      </Flex>
    </div>
  );
}
