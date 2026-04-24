'use client';

import { useState } from 'react';
import { loginAdmin } from '../actions';

export default function AdminLogin() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(formData: FormData) {
    setIsPending(true);
    setError(null);
    const result = await loginAdmin(formData);
    if (result?.error) {
      setError(result.error);
      setIsPending(false);
    }
  }

  return (
    <div className="flex items-center justify-center min-h-[80vh]">
      <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl p-8 shadow-xl">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-orange-500 mb-2">Admin Login</h1>
          <p className="text-neutral-400">Enter your credentials to access the dashboard</p>
        </div>

        <form action={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded-lg text-sm text-center">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-300" htmlFor="username">
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              required
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-3 text-neutral-100 focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all"
              placeholder="Enter admin username"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-300" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-3 text-neutral-100 focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all"
              placeholder="Enter password"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white font-medium py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isPending ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
