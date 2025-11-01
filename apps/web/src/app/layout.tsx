'use client';

import { GeistSans } from 'geist/font/sans';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ThemeProvider } from 'next-themes';
import ThemeToggle from '@/components/ThemeToggle';
import { HomeIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import './globals.css';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();

  return (
    <html
      lang="en"
      className={`${GeistSans.className} h-full antialiased dark:bg-gray-950 scroll-smooth`}
    >
      <body className="h-full bg-gray-50 dark:bg-gray-950">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <div className="flex min-h-full flex-col">
            {/* Header */}
            <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:bg-gray-900/70 dark:border-gray-800 shadow-sm">
              <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="flex h-16 items-center justify-between">
                  <div className="flex items-center gap-8">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-br from-black to-gray-800 shadow-sm">
                        <span className="text-md font-bold text-white">R</span>
                      </div>
                      <h1 className="text-xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">
                        Trust & Safety Dashboard
                      </h1>
                    </div>

                    {/* Navigation */}
                    <nav className="hidden md:flex md:gap-1">
                      <Link
                        href="/"
                        className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:shadow-sm ${
                          pathname === '/'
                            ? 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100'
                        }`}
                      >
                        <HomeIcon className="h-4 w-4" />
                        Dashboard
                      </Link>
                      <Link
                        href="/search"
                        className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:shadow-sm ${
                          pathname === '/search'
                            ? 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100'
                        }`}
                      >
                        <MagnifyingGlassIcon className="h-4 w-4" />
                        Search
                      </Link>
                    </nav>
                  </div>

                  <div className="flex items-center gap-3">
                    <ThemeToggle />
                    <div className="hidden sm:block text-right">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Last updated</p>
                      <p className="text-xs font-medium text-gray-900 dark:text-gray-100">
                        {new Date().toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </header>

            {/* Main Content */}
            <main className="flex-1">
              <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</div>
            </main>

            {/* Footer */}
            <footer className="border-t border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
              <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
                <p className="text-center text-xs text-gray-500 dark:text-gray-400">
                  Built with ❤️ by Matt Gilbert. Real-time monitoring powered by ClickHouse and
                  Meilisearch
                </p>
              </div>
            </footer>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
