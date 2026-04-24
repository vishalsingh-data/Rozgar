import { cookies } from 'next/headers';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-neutral-800/50 bg-neutral-950/90 px-4 md:px-6 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex size-7 items-center justify-center rounded-lg bg-[#1B4332]">
            <span className="text-xs font-black text-[#40C057]">R</span>
          </div>
          <span className="text-sm font-bold text-neutral-200" style={{ fontFamily: 'var(--font-heading)' }}>
            Rozgar <span className="text-neutral-600">/ Admin</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-[#40C057] animate-pulse" />
          <span className="text-xs text-neutral-500">Live</span>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl mx-auto animate-in fade-in duration-300">
        {children}
      </main>
    </div>
  );
}
