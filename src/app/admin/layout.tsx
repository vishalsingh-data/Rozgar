import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_token');

  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-100 font-sans">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-neutral-800 bg-neutral-950/80 px-4 md:px-6 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold text-orange-500">Rozgar</span>
          <span className="text-sm text-neutral-400">Admin Dashboard</span>
        </div>
      </header>
      
      <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
        {children}
      </main>
    </div>
  );
}
