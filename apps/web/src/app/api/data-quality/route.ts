import { NextRequest, NextResponse } from "next/server";
import { getDataQualityMetrics } from "@/lib/clickhouse";
import { DataQualityRow, DataQualityMetric } from "@/types/clickhouse";
import { z } from "zod";

// Validate query parameters
const QuerySchema = z.object({
  timeRange: z.string().regex(/^\d+\s+(MINUTE|HOUR|DAY)$/i),
});

export async function GET(request: NextRequest) {
  try {
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const { timeRange } = QuerySchema.parse(searchParams);

    const result = await getDataQualityMetrics(timeRange);
    const rows = (await result.json()) as DataQualityRow[];

    // Process data quality metrics
    const metrics: DataQualityMetric[] = rows.map((row) => ({
      minute: row.minute,
      total_events: Number(row.total_events),
      missing_ip: Number(row.missing_ip),
      missing_user: Number(row.missing_user),
      missing_user_agent: Number(row.missing_user_agent),
      missing_email: Number(row.missing_email),
      unique_ids: Number(row.unique_ids),
      duplicate_count: Number(row.duplicate_count),
      // Calculate percentage of events with quality issues
      quality_score: (
        (1 -
          (Number(row.missing_ip) +
            Number(row.missing_user) +
            Number(row.missing_user_agent) +
            Number(row.missing_email) +
            Number(row.duplicate_count)) /
            Number(row.total_events)) *
        100
      ).toFixed(2),
    }));

    return NextResponse.json(metrics);
  } catch (error) {
    console.error("Error fetching data quality metrics:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid time range parameter" },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "Failed to fetch data quality metrics" },
      { status: 500 },
    );
  }
}
