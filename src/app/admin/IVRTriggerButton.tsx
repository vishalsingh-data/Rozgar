'use client';

import { useState } from 'react';

export default function IVRTriggerButton() {
  const [phone, setPhone] = useState('+91');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleTrigger = async () => {
    if (!phone || phone.length < 10) return;
    
    setStatus('loading');
    setMessage('');

    try {
      // Trigger the IVR call using the existing route
      const res = await fetch(`/api/telephony/ivr/test-call?to=${encodeURIComponent(phone)}`);
      const data = await res.json();

      if (res.ok && data.success) {
        setStatus('success');
        setMessage('Call initiated successfully! Check your phone.');
      } else {
        setStatus('error');
        setMessage(data.error || 'Failed to initiate call');
      }
    } catch (err: any) {
      setStatus('error');
      setMessage(err.message || 'Network error occurred');
    }
  };

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
      <h2 className="text-xl font-semibold text-orange-500 mb-2">Automated IVR Tester</h2>
      <p className="text-neutral-400 text-sm mb-6">
        Trigger the voice AI onboarding workflow directly from this dashboard. Make sure your Cloudflare tunnel is running.
      </p>

      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+919876543210"
          className="flex-1 bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-3 text-neutral-100 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
        />
        <button
          onClick={handleTrigger}
          disabled={status === 'loading'}
          className="bg-orange-600 hover:bg-orange-700 text-white font-medium px-6 py-3 rounded-lg transition-colors disabled:opacity-50 min-w-[140px] flex justify-center items-center"
        >
          {status === 'loading' ? (
            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
          ) : (
            'Make Test Call'
          )}
        </button>
      </div>

      {message && (
        <div className={`mt-4 p-3 rounded-lg text-sm border ${status === 'success' ? 'bg-green-500/10 border-green-500/50 text-green-500' : 'bg-red-500/10 border-red-500/50 text-red-500'}`}>
          {message}
        </div>
      )}
    </div>
  );
}
