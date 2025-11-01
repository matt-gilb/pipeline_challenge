import { NextRequest, NextResponse } from 'next/server';
import { getRecentMetrics } from '@/lib/clickhouse';
import { z } from 'zod';

// Validate query parameters
const QuerySchema = z.object({
  timeRange: z.string().regex(/^\d+\s+(MINUTE|HOUR|DAY)$/i),
});

export async function GET(request: NextRequest) {
  try {
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const { timeRange } = QuerySchema.parse(searchParams);

    const result = await getRecentMetrics(timeRange);
    const rows = await result.json();

    // Process metrics
    const metrics = rows.map((row: any) => ({
      minute: row.minute,
      type: row.type,
      event_count: Number(row.event_count),
      successful_logins: Number(row.successful_logins),
      failed_logins: Number(row.failed_logins),
      avg_response_time_ms: Number(row.avg_response_time_ms),
      error_count: Number(row.error_count),
      warning_count: Number(row.warning_count),
      emails_sent: Number(row.emails_sent),
      hard_bounces: Number(row.hard_bounces),
    }));

    return NextResponse.json(metrics);
  } catch (error) {
    console.error('Error fetching metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch metrics' },
      { status: 500 }
    );
  }
}
