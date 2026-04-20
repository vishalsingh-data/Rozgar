'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  UserPlus, 
  Phone, 
  MapPin, 
  Briefcase, 
  CheckCircle2, 
  Loader2,
  ShieldCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export default function RegisterWorkerPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    type: 'daily_wage',
    pincode: '',
    raw_description: ''
  });

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Get current partner user
      const { data: { user } } = await supabase.auth.getUser();
      
      // For demo, fallback to Vikram's ID from seed
      const partnerId = user?.id || 'b307840a-b150-43bd-8e5b-e5c3be0d0447';

      // 2. Create User entry
      const { data: newUser, error: userError } = await supabase
        .from('users')
        .insert({
          role: 'worker',
          phone: formData.phone,
          name: formData.name,
          language_pref: 'hindi', // Default for now
          is_active: true
        })
        .select()
        .single();

      if (userError) {
        if (userError.code === '23505') throw new Error('Phone number already registered');
        throw userError;
      }

      // 3. Create Worker entry
      const { error: workerError } = await supabase
        .from('workers')
        .insert({
          user_id: newUser.id,
          type: formData.type as any,
          raw_description: formData.raw_description,
          pincode: formData.pincode,
          partner_node_id: partnerId,
          is_new: true,
          aadhar_verified: false
        });

      if (workerError) throw workerError;

      toast.success(`${formData.name} registered successfully!`);
      router.push('/partner/dashboard');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 pb-20 dark:bg-black">
      {/* Header */}
      <header className="border-b bg-white px-6 py-8 dark:bg-zinc-900">
        <div className="mx-auto max-w-lg">
          <h1 className="text-2xl font-bold tracking-tight">Register New Worker</h1>
          <p className="text-sm text-zinc-500">Add a worker to your local partner network.</p>
        </div>
      </header>

      <main className="mx-auto max-w-lg p-6">
        <form onSubmit={handleRegister} className="space-y-6">
          
          <div className="rounded-2xl bg-white p-6 shadow-sm dark:bg-zinc-900">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-zinc-400">
              <UserPlus className="size-4" />
              Basic Details
            </h2>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input 
                  id="name" 
                  placeholder="e.g. Raju Kumar" 
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
                  <Input 
                    id="phone" 
                    placeholder="9100000000" 
                    className="pl-10"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm dark:bg-zinc-900">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-zinc-400">
              <Briefcase className="size-4" />
              Work Details
            </h2>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Worker Category</Label>
                <Select 
                  value={formData.type} 
                  onValueChange={(val) => setFormData({...formData, type: val})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="skilled">Skilled (Electrician, Plumber)</SelectItem>
                    <SelectItem value="semi_skilled">Semi-Skilled (Painter, Carpenter)</SelectItem>
                    <SelectItem value="daily_wage">Daily Wage Labour</SelectItem>
                    <SelectItem value="domestic">Domestic Help</SelectItem>
                    <SelectItem value="driver">Driver</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="pincode">Service Pincode</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
                  <Input 
                    id="pincode" 
                    placeholder="560068" 
                    className="pl-10"
                    required
                    value={formData.pincode}
                    onChange={(e) => setFormData({...formData, pincode: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="desc">Short Description of Skills</Label>
                <Input 
                  id="desc" 
                  placeholder="e.g. Loading, moving, gardening" 
                  value={formData.raw_description}
                  onChange={(e) => setFormData({...formData, raw_description: e.target.value})}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-xl bg-blue-50 p-4 text-xs text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">
            <ShieldCheck className="size-4 shrink-0" />
            <p>
              By registering this worker, you confirm they are known to you. 
              Verification of Aadhar can be done later in the dashboard.
            </p>
          </div>

          <Button 
            type="submit" 
            className="h-14 w-full gap-2 rounded-2xl text-lg font-bold shadow-lg shadow-primary/20"
            disabled={loading}
          >
            {loading ? <Loader2 className="size-5 animate-spin" /> : <CheckCircle2 className="size-5" />}
            Complete Registration
          </Button>

        </form>
      </main>
    </div>
  );
}
