'use client';

import { Grid, Card, Title, Text, AreaChart, BarChart, DonutChart } from '@tremor/react';
import MetricCard from '@/components/dashboard/MetricCard';
import DashboardFilterBar from '@/components/dashboard/DashboardFilterBar';
import { useEffect, useState } from 'react';
import { formatNumberShort, formatMs } from '@/lib/format';
import { makeTremorTooltip } from '@/components/dashboard/ChartTooltip';

interface Metric {
  minute: string;
  type: string;
  event_count: number;
  successful_logins: number;
  failed_logins: number;
  avg_response_time_ms: number;
  error_count: number;
  warning_count: number;
  emails_sent: number;
  hard_bounces: number;
}

interface DataQuality {
  minute: string;
  total_events: number;
  missing_ip: number;
  missing_user: number;
  missing_user_agent: number;
  missing_email: number;
  duplicate_count: number;
}

export default function Dashboard() {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [dataQuality, setDataQuality] = useState<DataQuality[]>([]);
  const [timeRange, setTimeRange] = useState('1 HOUR');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [metricsRes, qualityRes] = await Promise.all([
          fetch(`/api/metrics?timeRange=${timeRange}`),
          fetch(`/api/data-quality?timeRange=${timeRange}`),
        ]);

        const metricsData = await metricsRes.json();
        const qualityData = await qualityRes.json();

        setMetrics(metricsData);
        setDataQuality(qualityData);
      } catch (error) {
        console.error('Matt probably just broke something. Error fetching dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 10000); // Refresh every 10 seconds

    return () => clearInterval(interval);
  }, [timeRange]);

  // Calculate summary metrics
  const totalEvents = metrics.reduce((sum, m) => sum + m.event_count, 0);
  const totalLogins = metrics.reduce((sum, m) => sum + m.successful_logins + m.failed_logins, 0);
  const loginSuccessRate =
    totalLogins > 0
      ? ((metrics.reduce((sum, m) => sum + m.successful_logins, 0) / totalLogins) * 100).toFixed(1)
      : '0';
  const totalErrors = metrics.reduce((sum, m) => sum + m.error_count, 0);
  const avgResponseTime =
    metrics.length > 0
      ? (metrics.reduce((sum, m) => sum + m.avg_response_time_ms, 0) / metrics.length).toFixed(1)
      : '0';

  return (
    <div className="space-y-6">
      {/* Overview Section */}
      <section aria-labelledby="overview">
        {/* Sticky filter bar */}
        <DashboardFilterBar timeRange={timeRange} onTimeRangeChange={setTimeRange} />

        <h1
          id="overview"
          className="scroll-mt-10 text-lg font-semibold text-gray-900 sm:text-xl dark:text-gray-50"
        >
          Overview
        </h1>

        {/* Key Metrics Cards */}
        <div className="mt-6">
          <Grid numItems={1} numItemsSm={2} numItemsLg={4} className="gap-5">
            <MetricCard
              title="Total Events"
              value={totalEvents.toLocaleString()}
              decorationColor="blue"
            />
            <MetricCard
              title="Login Success Rate"
              value={`${loginSuccessRate}%`}
              decorationColor="emerald"
              trendLabel={parseFloat(loginSuccessRate) >= 95 ? 'Healthy' : 'Needs Attention'}
              trendColor={parseFloat(loginSuccessRate) >= 95 ? 'emerald' : 'amber'}
            />
            <MetricCard
              title="Avg Response Time"
              value={`${avgResponseTime}ms`}
              decorationColor="amber"
            />
            <MetricCard
              title="Total Errors"
              value={totalErrors.toLocaleString()}
              decorationColor="rose"
            />
          </Grid>
        </div>
      </section>

      {/* Trends Section */}
      <section aria-labelledby="trends" className="space-y-6">
        <h2
          id="trends"
          className="mt-10 scroll-mt-8 text-lg font-semibold text-gray-900 sm:text-xl dark:text-gray-50"
        >
          Trends
        </h2>

        <Grid numItems={1} numItemsLg={2} className="gap-5">
          <Card>
            <Title>Event Volume</Title>
            <Text>Total events processed over time</Text>
            <AreaChart
              className="mt-6 h-80"
              data={metrics}
              categories={['event_count']}
              index="minute"
              colors={['blue']}
              valueFormatter={(value: number) => formatNumberShort(value)}
              showLegend={false}
              showAnimation={true}
              customTooltip={makeTremorTooltip({ event_count: formatNumberShort })}
            />
          </Card>
          <Card>
            <Title>Login Activity</Title>
            <Text>Successful vs failed login attempts</Text>
            <AreaChart
              className="mt-6 h-80"
              data={metrics}
              categories={['successful_logins', 'failed_logins']}
              index="minute"
              colors={['emerald', 'rose']}
              valueFormatter={(value: number) => formatNumberShort(value)}
              showLegend={true}
              showAnimation={true}
              customTooltip={makeTremorTooltip({
                successful_logins: formatNumberShort,
                failed_logins: formatNumberShort,
              })}
            />
          </Card>
        </Grid>

        <Grid numItems={1} numItemsLg={2} className="gap-5">
          <Card>
            <Title>API Response Time</Title>
            <Text>Average response time in milliseconds</Text>
            <AreaChart
              className="mt-6 h-80"
              data={metrics}
              categories={['avg_response_time_ms']}
              index="minute"
              colors={['amber']}
              valueFormatter={(value: number) => formatMs(value, { style: 'short', decimals: 1 })}
              showLegend={false}
              showAnimation={true}
              customTooltip={makeTremorTooltip({
                avg_response_time_ms: (v) => formatMs(v, { style: 'short', decimals: 1 }),
              })}
            />
          </Card>
          <Card>
            <Title>Data Quality Issues</Title>
            <Text>Missing fields and duplicate records</Text>
            <BarChart
              className="mt-6 h-80"
              data={dataQuality}
              categories={['missing_ip', 'missing_user', 'missing_user_agent', 'duplicate_count']}
              index="minute"
              colors={['amber', 'violet', 'rose', 'fuchsia']}
              valueFormatter={(value: number) => formatNumberShort(value)}
              stack={true}
              showLegend={true}
              showAnimation={true}
              customTooltip={makeTremorTooltip(
                {
                  missing_ip: formatNumberShort,
                  missing_user: formatNumberShort,
                  missing_user_agent: formatNumberShort,
                  duplicate_count: formatNumberShort,
                },
                undefined,
                { showTotal: true, totalLabel: 'Total issues' }
              )}
            />
          </Card>
        </Grid>

        <Grid numItems={1} numItemsLg={2} className="gap-5">
          <Card>
            <Title>Error Distribution</Title>
            <Text>Server and client error breakdown</Text>
            <DonutChart
              className="mt-6 h-80"
              data={[
                {
                  name: 'Server Errors (5xx)',
                  value: metrics.reduce((sum, m) => sum + m.error_count, 0),
                },
                {
                  name: 'Client Errors (4xx)',
                  value: metrics.reduce((sum, m) => sum + m.warning_count, 0),
                },
              ]}
              category="value"
              index="name"
              colors={['rose', 'amber']}
              valueFormatter={(value: number) => formatNumberShort(value)}
              showLabel={true}
              showAnimation={true}
              customTooltip={makeTremorTooltip({ value: formatNumberShort })}
            />
          </Card>
          <Card>
            <Title>Email Activity</Title>
            <Text>Emails sent and bounce tracking</Text>
            <AreaChart
              className="mt-6 h-80"
              data={metrics}
              categories={['emails_sent', 'hard_bounces']}
              index="minute"
              colors={['emerald', 'rose']}
              valueFormatter={(value: number) => formatNumberShort(value)}
              showLegend={true}
              showAnimation={true}
              customTooltip={makeTremorTooltip({
                emails_sent: formatNumberShort,
                hard_bounces: formatNumberShort,
              })}
            />
          </Card>
        </Grid>
      </section>
    </div>
  );
}
