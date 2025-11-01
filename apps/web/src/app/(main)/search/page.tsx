'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Title,
  Text,
  TextInput,
  Select,
  SelectItem,
  Badge,
  Table,
  TableHead,
  TableHeaderCell,
  TableBody,
  TableRow,
  TableCell,
  Button,
  Flex,
  Grid,
} from '@tremor/react';
import { MagnifyingGlassIcon, ArrowPathIcon, HomeIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import Link from 'next/link';

interface SearchResult {
  id: string;
  timestamp: number;
  type: string;
  userId: string;
  sourceIp: string;
  success?: boolean;
  action?: string;
  method?: string;
  path?: string;
  statusCode?: number;
  recipientEmail?: string;
  bounceType?: string;
}

const EVENT_TYPES = ['account_activity', 'api_request', 'email_send'] as const;

const EVENT_TYPE_LABELS: Record<string, string> = {
  account_activity: 'Account Activity',
  api_request: 'API Request',
  email_send: 'Email Send',
};

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [timeRange, setTimeRange] = useState('1');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalResults, setTotalResults] = useState(0);

  const searchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const filters: string[] = [];

      // Add type filter if selected
      if (selectedType) {
        filters.push(`type = '${selectedType}'`);
      }

      // Add time range filter using Unix timestamp
      if (timeRange) {
        const hours = parseFloat(timeRange);
        const timestampThreshold = Math.floor(Date.now() / 1000) - hours * 3600;
        filters.push(`timestamp > ${timestampThreshold}`);
      }

      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          filters,
          limit: 50,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setResults(data.hits || []);
      setTotalResults(data.hits?.length || 0);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
      setTotalResults(0);
    } finally {
      setLoading(false);
    }
  }, [query, selectedType, timeRange]);

  // Load initial results on mount and when filters change
  useEffect(() => {
    searchEvents();
  }, [searchEvents]);

  function getStatusBadge(statusCode?: number) {
    if (!statusCode) return null;
    if (statusCode < 400) return <Badge color="emerald">{statusCode}</Badge>;
    if (statusCode < 500) return <Badge color="amber">{statusCode}</Badge>;
    return <Badge color="rose">{statusCode}</Badge>;
  }

  function getSuccessBadge(success?: boolean) {
    if (success === undefined) return null;
    return success ? (
      <Badge color="emerald" icon={undefined}>
        Success
      </Badge>
    ) : (
      <Badge color="rose" icon={undefined}>
        Failed
      </Badge>
    );
  }

  function getEventTypeBadge(type: string) {
    const colors: Record<string, 'blue' | 'purple' | 'cyan'> = {
      account_activity: 'blue',
      api_request: 'purple',
      email_send: 'cyan',
    };
    return <Badge color={colors[type] || 'gray'}>{EVENT_TYPE_LABELS[type] || type}</Badge>;
  }

  return (
    <div className="space-y-6">
      {/* Search Section */}
      <section aria-labelledby="search-heading">
        <h1
          id="search-heading"
          className="scroll-mt-10 text-lg font-semibold text-gray-900 sm:text-xl dark:text-gray-50"
        >
          Event Search
        </h1>
        <Text className="mt-1">Search and filter through all system events</Text>
        <div className="sticky top-16 z-20 mt-4 flex items-center justify-between border-b border-gray-200 bg-white pb-4 pt-4 sm:pt-6 dark:border-gray-800 dark:bg-gray-950">
          {/* Reserved for quick filters */}
          <div className="h-0" />
        </div>
      </section>

      {/* Search and Filters Card */}
      <section aria-labelledby="filters">
        <h2 id="filters" className="sr-only">
          Filters
        </h2>
        <Card decoration="top" decorationColor="blue">
          <div className="space-y-4">
            <div>
              <Title>Search Filters</Title>
              <Grid numItems={1} numItemsSm={2} numItemsLg={4} className="gap-5">
                <div className="sm:col-span-2">
                  <label
                    htmlFor="search-input"
                    className="mb-1.5 block text-sm font-medium text-gray-700"
                  >
                    Search Query
                  </label>
                  <TextInput
                    id="search-input"
                    icon={MagnifyingGlassIcon}
                    placeholder="Search by user ID, IP, email..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>

                <div>
                  <label
                    htmlFor="event-type"
                    className="mb-1.5 block text-sm font-medium text-gray-700"
                  >
                    Event Type
                  </label>
                  <Select
                    id="event-type"
                    value={selectedType}
                    onValueChange={setSelectedType}
                    placeholder="All Types"
                  >
                    <SelectItem value="">All Types</SelectItem>
                    {EVENT_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {EVENT_TYPE_LABELS[type]}
                      </SelectItem>
                    ))}
                  </Select>
                </div>

                <div>
                  <label
                    htmlFor="time-range"
                    className="mb-1.5 block text-sm font-medium text-gray-700"
                  >
                    Time Range
                  </label>
                  <Select id="time-range" value={timeRange} onValueChange={setTimeRange}>
                    <SelectItem value="0.25">Last 15 Minutes</SelectItem>
                    <SelectItem value="1">Last Hour</SelectItem>
                    <SelectItem value="6">Last 6 Hours</SelectItem>
                    <SelectItem value="24">Last 24 Hours</SelectItem>
                  </Select>
                </div>
              </Grid>
            </div>

            <Flex justifyContent="end" className="gap-2 border-t border-gray-200 pt-4">
              <Button
                icon={ArrowPathIcon}
                variant="secondary"
                onClick={searchEvents}
                loading={loading}
              >
                Refresh
              </Button>
            </Flex>
          </div>
        </Card>
      </section>

      {/* Results Summary */}
      <section aria-labelledby="results">
        <h2 id="results" className="sr-only">
          Results
        </h2>
        <Card decoration="left" decorationColor="blue">
          <Flex alignItems="center" justifyContent="between">
            <div>
              <Text>Search Results</Text>
              <p className="mt-1 text-2xl font-semibold text-gray-900">
                {totalResults.toLocaleString()} {totalResults === 1 ? 'event' : 'events'}
              </p>
            </div>
            {loading && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <ArrowPathIcon className="h-4 w-4 animate-spin" />
                <span>Loading...</span>
              </div>
            )}
          </Flex>
        </Card>

        {/* Results Table */}
        <Card>
          {loading && results.length === 0 ? (
            <div className="py-12 text-center">
              <ArrowPathIcon className="mx-auto h-10 w-10 animate-spin text-gray-400" />
              <Title className="mt-3">Loading results</Title>
              <Text className="mt-1">Fetching latest events...</Text>
            </div>
          ) : results.length === 0 ? (
            <div className="py-12 text-center">
              <MagnifyingGlassIcon className="mx-auto h-10 w-10 text-gray-400" />
              <Title className="mt-3">No results found</Title>
              <Text className="mt-1">Try adjusting your search query or filters</Text>
            </div>
          ) : (
            <div>
              <Title>Event Details</Title>
              <Text className="mt-1 mb-4">Showing {results.length} most recent events</Text>
              <div className="overflow-x-auto">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableHeaderCell>Timestamp</TableHeaderCell>
                      <TableHeaderCell>Type</TableHeaderCell>
                      <TableHeaderCell>User ID</TableHeaderCell>
                      <TableHeaderCell>Source IP</TableHeaderCell>
                      <TableHeaderCell>Details</TableHeaderCell>
                      <TableHeaderCell>Status</TableHeaderCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {results.map((result) => (
                      <TableRow key={result.id}>
                        <TableCell>
                          <span className="text-sm font-medium text-gray-900">
                            {format(new Date(result.timestamp * 1000), 'MMM dd, HH:mm:ss')}
                          </span>
                        </TableCell>
                        <TableCell>{getEventTypeBadge(result.type)}</TableCell>
                        <TableCell>
                          <span className="font-mono text-xs text-gray-600">{result.userId}</span>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-xs text-gray-600">{result.sourceIp}</span>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs truncate text-sm text-gray-600">
                            {result.type === 'account_activity' && result.action && (
                              <span className="capitalize">{result.action.replace('_', ' ')}</span>
                            )}
                            {result.type === 'api_request' && (
                              <span className="font-mono">
                                {result.method} {result.path}
                              </span>
                            )}
                            {result.type === 'email_send' && <span>{result.recipientEmail}</span>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {getStatusBadge(result.statusCode)}
                            {getSuccessBadge(result.success)}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </Card>
      </section>
    </div>
  );
}
