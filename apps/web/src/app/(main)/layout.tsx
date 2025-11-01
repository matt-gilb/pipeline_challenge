/* Add route group layout to centralize page container and padding */

export default function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="relative">
      {/* Centralized container and page padding for all routes within the (main) group */}
      <div className="mx-auto max-w-screen-2xl p-4 sm:px-6 sm:pb-10 sm:pt-10 lg:px-10 lg:pt-7">
        {children}
      </div>
    </div>
  );
}
