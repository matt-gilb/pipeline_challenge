/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@pipeline/shared', '@tremor/react', 'recharts', '@radix-ui/react-select'],

  // Output configuration
  output: 'standalone',

  // Environment variables available to the browser
  env: {
    CLICKHOUSE_HOST: process.env.CLICKHOUSE_HOST,
    MEILISEARCH_HOST: process.env.MEILISEARCH_HOST,
    MEILISEARCH_KEY: process.env.MEILISEARCH_KEY,
  },

  // Compiler options
  compiler: {
    removeConsole:
      process.env.NODE_ENV === 'production'
        ? {
            exclude: ['error', 'warn'],
          }
        : false,
  },
};

module.exports = nextConfig;
