import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase-server';
import IVRTriggerButton from './IVRTriggerButton';
import { logoutAdmin } from './actions';

export default async function AdminDashboard() {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_token');

  const expectedToken = process.env.ADMIN_SESSION_SECRET || 'rozgar-admin-fallback-secret';
  if (!token || token.value !== expectedToken) {
    redirect('/admin/login');
  }

  // Fetch data in parallel
  const [
    { data: users },
    { data: workers },
    { data: partners }
  ] = await Promise.all([
    supabaseAdmin.from('users').select('*').order('created_at', { ascending: false }),
    supabaseAdmin.from('workers').select('*, users(name, phone)').order('strike_count', { ascending: true }),
    supabaseAdmin.from('users').select('*').eq('role', 'partner_node').order('created_at', { ascending: false })
  ]);

  return (
    <div className="space-y-8 pb-12">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Dashboard Overview</h1>
          <p className="text-neutral-400 mt-1">Manage Rozgar platform resources</p>
        </div>
        <form action={logoutAdmin}>
          <button className="text-sm text-neutral-400 hover:text-white px-4 py-2 border border-neutral-700 rounded-lg transition-colors">
            Logout
          </button>
        </form>
      </div>

      <IVRTriggerButton />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
          <h3 className="text-neutral-400 text-sm font-medium">Total Users</h3>
          <p className="text-3xl font-bold text-white mt-2">{users?.length || 0}</p>
        </div>
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
          <h3 className="text-neutral-400 text-sm font-medium">Registered Workers</h3>
          <p className="text-3xl font-bold text-white mt-2">{workers?.length || 0}</p>
        </div>
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
          <h3 className="text-neutral-400 text-sm font-medium">Partner Nodes</h3>
          <p className="text-3xl font-bold text-white mt-2">{partners?.length || 0}</p>
        </div>
      </div>

      {/* Workers Table */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
        <div className="px-6 py-5 border-b border-neutral-800 bg-neutral-950/50">
          <h2 className="text-lg font-semibold text-white">Recent Workers</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-neutral-300">
            <thead className="bg-neutral-950/30 text-neutral-400 text-xs uppercase border-b border-neutral-800">
              <tr>
                <th className="px-6 py-4 font-medium">Name</th>
                <th className="px-6 py-4 font-medium">Phone</th>
                <th className="px-6 py-4 font-medium">Type / Skills</th>
                <th className="px-6 py-4 font-medium">Pincode</th>
                <th className="px-6 py-4 font-medium text-center">Strikes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {workers?.slice(0, 10).map((worker: any) => (
                <tr key={worker.user_id} className="hover:bg-neutral-800/50 transition-colors">
                  <td className="px-6 py-4">{worker.users?.name || 'Unknown'}</td>
                  <td className="px-6 py-4">{worker.users?.phone || '-'}</td>
                  <td className="px-6 py-4">
                    <span className="inline-block px-2 py-1 bg-orange-500/10 text-orange-500 rounded text-xs mr-2">
                      {worker.type}
                    </span>
                    <span className="text-neutral-400 truncate max-w-[200px] inline-block align-bottom">
                      {worker.searchable_as?.join(', ') || '-'}
                    </span>
                  </td>
                  <td className="px-6 py-4">{worker.pincode || '-'}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${worker.strike_count > 0 ? 'bg-red-500/20 text-red-500' : 'bg-green-500/10 text-green-500'}`}>
                      {worker.strike_count}
                    </span>
                  </td>
                </tr>
              ))}
              {(!workers || workers.length === 0) && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-neutral-500">
                    No workers registered yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
        <div className="px-6 py-5 border-b border-neutral-800 bg-neutral-950/50">
          <h2 className="text-lg font-semibold text-white">All Users</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-neutral-300">
            <thead className="bg-neutral-950/30 text-neutral-400 text-xs uppercase border-b border-neutral-800">
              <tr>
                <th className="px-6 py-4 font-medium">Name</th>
                <th className="px-6 py-4 font-medium">Phone</th>
                <th className="px-6 py-4 font-medium">Role</th>
                <th className="px-6 py-4 font-medium">Language</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {users?.slice(0, 10).map((user: any) => (
                <tr key={user.id} className="hover:bg-neutral-800/50 transition-colors">
                  <td className="px-6 py-4">{user.name || 'Anonymous'}</td>
                  <td className="px-6 py-4">{user.phone}</td>
                  <td className="px-6 py-4 capitalize">
                    <span className={`inline-block px-2 py-1 rounded text-xs ${
                      user.role === 'customer' ? 'bg-blue-500/10 text-blue-400' : 
                      user.role === 'worker' ? 'bg-orange-500/10 text-orange-400' : 
                      'bg-purple-500/10 text-purple-400'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 capitalize">{user.language_pref || 'Hindi'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
