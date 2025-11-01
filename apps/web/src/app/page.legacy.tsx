'use client';

import {
  Card,
  Title,
  Text,
  Metric,
  AreaChart,
  BarChart,
  DonutChart,
  Flex,
  Grid,
  Button,
  Badge,
  Select,
  SelectItem,
} from '@tremor/react';
import { useEffect, useState } from 'react';

import { ArrowTrendingUpIcon, ArrowTrendingDownIcon } from '@heroicons/react/24/solid';

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
      {/* Header Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Title>Overview</Title>
          <Text className="mt-1">Real-time monitoring of system events and data quality</Text>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectItem value="15 MINUTE">Last 15 Minutes</SelectItem>
            <SelectItem value="1 HOUR">Last Hour</SelectItem>
            <SelectItem value="6 HOUR">Last 6 Hours</SelectItem>
          </Select>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <Grid numItems={1} numItemsSm={2} numItemsLg={4} className="gap-5">
        <Card decoration="top" decorationColor="blue">
          <Flex alignItems="start">
            <div>
              <Text>Total Events</Text>
              <Metric>{totalEvents.toLocaleString()}</Metric>
            </div>
          </Flex>
        </Card>

        <Card decoration="top" decorationColor="emerald">
          <Flex alignItems="start">
            <div>
              <Text>Login Success Rate</Text>
              <Metric>{loginSuccessRate}%</Metric>
            </div>
          </Flex>
          <Flex className="mt-2" justifyContent="start">
            {parseFloat(loginSuccessRate) >= 95 ? (
              <Badge color="emerald" icon={ArrowTrendingUpIcon}>
                Healthy
              </Badge>
            ) : (
              <Badge color="amber" icon={ArrowTrendingDownIcon}>
                Needs Attention
              </Badge>
            )}
          </Flex>
        </Card>

        <Card decoration="top" decorationColor="amber">
          <Flex alignItems="start">
            <div>
              <Text>Avg Response Time</Text>
              <Metric>{avgResponseTime}ms</Metric>
            </div>
          </Flex>
        </Card>

        <Card decoration="top" decorationColor="rose">
          <Flex alignItems="start">
            <div>
              <Text>Total Errors</Text>
              <Metric>{totalErrors.toLocaleString()}</Metric>
            </div>
          </Flex>
        </Card>
      </Grid>

      {/* Charts Section */}
      <div className="space-y-6">
        {/* Event Volume */}
        <Card>
          <Title>Event Volume</Title>
          <Text>Total events processed over time</Text>
          <AreaChart
            className="mt-6 h-80"
            data={metrics}
            categories={['event_count']}
            index="minute"
            colors={['blue']}
            valueFormatter={(value: number) => value.toLocaleString()}
            showLegend={false}
            showAnimation={true}
          />
        </Card>

        {/* Login Activity and API Performance */}
        <Grid numItems={1} numItemsLg={2} className="gap-5">
          <Card>
            <Title>Login Activity</Title>
            <Text>Successful vs failed login attempts</Text>
            <AreaChart
              className="mt-6 h-80"
              data={metrics}
              categories={['successful_logins', 'failed_logins']}
              index="minute"
              colors={['emerald', 'rose']}
              valueFormatter={(value: number) => value.toLocaleString()}
              showLegend={true}
              showAnimation={true}
            />
          </Card>

          <Card>
            <Title>API Response Time</Title>
            <Text>Average response time in milliseconds</Text>
            <AreaChart
              className="mt-6 h-80"
              data={metrics}
              categories={['avg_response_time_ms']}
              index="minute"
              colors={['amber']}
              valueFormatter={(value: number) => `${value.toFixed(1)}ms`}
              showLegend={false}
              showAnimation={true}
            />
          </Card>
        </Grid>

        {/* Data Quality and Error Distribution */}
        <Grid numItems={1} numItemsLg={2} className="gap-5">
          <Card>
            <Title>Data Quality Issues</Title>
            <Text>Missing fields and duplicate records</Text>
            <BarChart
              className="mt-6 h-80"
              data={dataQuality}
              categories={['missing_ip', 'missing_user', 'missing_user_agent', 'duplicate_count']}
              index="minute"
              colors={['amber', 'violet', 'rose', 'fuchsia']}
              valueFormatter={(value: number) => value.toLocaleString()}
              stack={true}
              showLegend={true}
              showAnimation={true}
            />
          </Card>

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
              valueFormatter={(value: number) => value.toLocaleString()}
              showLabel={true}
              showAnimation={true}
            />
          </Card>
        </Grid>

        {/* Email Metrics */}
        <Card>
          <Title>Email Activity</Title>
          <Text>Emails sent and bounce tracking</Text>
          <AreaChart
            className="mt-6 h-80"
            data={metrics}
            categories={['emails_sent', 'hard_bounces']}
            index="minute"
            colors={['emerald', 'rose']}
            valueFormatter={(value: number) => value.toLocaleString()}
            showLegend={true}
            showAnimation={true}
          />
        </Card>
      </div>
    </div>
  );
}
