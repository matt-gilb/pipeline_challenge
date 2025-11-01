import { MeiliSearch } from 'meilisearch';

// Configure Meilisearch client
export const meilisearch = new MeiliSearch({
  host: `http://${process.env.MEILISEARCH_HOST || 'localhost'}:7700`,
  apiKey: process.env.MEILISEARCH_KEY || 'pipeline_secure_master_key_2024',
});

// Search interface
export interface SearchParams {
  query: string;
  filters?: string[];
  sort?: string[];
  limit?: number;
  offset?: number;
}

// Search events with filters and sorting
export async function searchEvents({
  query,
  filters = [],
  sort = ['timestamp:desc'],
  limit = 20,
  offset = 0,
}: SearchParams) {
  const index = await meilisearch.getIndex('events');

  return await index.search(query, {
    filter: filters,
    sort,
    limit,
    offset,
  });
}

// Get event by ID
export async function getEventById(id: string) {
  const index = await meilisearch.getIndex('events');
  return await index.getDocument(id);
}

// Get facet stats for filters
export async function getEventFacets() {
  const index = await meilisearch.getIndex('events');

  return await index.search('', {
    facets: [
      'type',
      'success',
      'action',
      'method',
      'statusCode',
      'bounceType',
      'geoLocation.country',
    ],
    limit: 0,
  });
}

// Suggest completions for search
export async function suggestSearch(prefix: string) {
  const index = await meilisearch.getIndex('events');

  return await index.search(prefix, {
    limit: 5,
    attributesToRetrieve: ['userId', 'sourceIp', 'recipientEmail', 'path'],
    attributesToHighlight: ['userId', 'sourceIp', 'recipientEmail', 'path'],
  });
}
