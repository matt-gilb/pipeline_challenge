import { NextRequest, NextResponse } from 'next/server';
import { searchEvents } from '@/lib/meilisearch';
import { z } from 'zod';

// Validate request body
const SearchRequestSchema = z.object({
  query: z.string().min(0),
  filters: z.array(z.string()).optional(),
  sort: z.array(z.string()).optional(),
  limit: z.number().min(1).max(100).optional(),
  offset: z.number().min(0).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, filters, sort, limit, offset } = SearchRequestSchema.parse(body);

    const results = await searchEvents({
      query,
      filters,
      sort: sort || ['timestamp:desc'],
      limit: limit || 50,
      offset: offset || 0,
    });

    return NextResponse.json(results);
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: 'Failed to perform search' },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Allow': 'POST, OPTIONS',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
