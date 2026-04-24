'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Camera, CheckCircle2, Loader2,
  User, Languages, MapPin, Wrench, Store,
  Phone, Building2, LogOut, Home,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import Image from 'next/image';

const SKILLS = [
  'Electrician', 'Plumber', 'Carpenter', 'Painter',
  'AC Technician', 'Appliance Repair', 'Mason', 'Welder',
  'Cleaning', 'Cook/Chef', 'Driver', 'Security Guard',
  'Gardener', 'Daily Wage Labor',
];

export default function ProfilePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // User base
  const [userId, setUserId] = useState('');
  const [role, setRole] = useState<string>('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Common editable
  const [name, setName] = useState('');
  const [language, setLanguage] = useState('english');
  const [pincode, setPincode] = useState('');
  const [phone, setPhone] = useState('');

  // Worker-specific
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [bio, setBio] = useState('');
  const [customSkill, setCustomSkill] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const customSkillInputRef = useRef<HTMLInputElement>(null);

  // Partner-specific
  const [nodeName, setNodeName] = useState('');
  const [address, setAddress] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  // landmark is only for partner nodes (not workers)
  const [landmark, setLandmark] = useState('');

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/login'); return; }

      const uid = session.user.id;
      setUserId(uid);
      setPhone(session.user.phone || session.user.email || '');

      // Avatar from auth metadata
      const meta = session.user.user_metadata;
      if (meta?.avatar_url) setAvatarUrl(meta.avatar_url);

      // Fetch all profile data via API (bypasses RLS on workers/partner_nodes)
      const res = await fetch(`/api/profile/get?userId=${uid}`);
      if (!res.ok) { router.push('/login'); return; }
      const { profile, workerData, partnerData } = await res.json();

      setRole(profile.role || '');
      setName(profile.name || '');
      setLanguage(profile.language_pref || 'english');
      if (profile.phone) setPhone(profile.phone);

      if (profile.role === 'worker' && workerData) {
        setBio(workerData.raw_description || '');
        setPincode(workerData.pincode || '');
        setSelectedSkills(Array.isArray(workerData.searchable_as) ? workerData.searchable_as : []);
        if (workerData.photo_url && !meta?.avatar_url) setAvatarUrl(workerData.photo_url);
      } else if (profile.role === 'customer') {
        if (meta?.pincode) setPincode(meta.pincode);
      } else if (profile.role === 'partner_node' && partnerData) {
        setNodeName(partnerData.name || '');
        setAddress(partnerData.address || '');
        setPincode(partnerData.pincode || '');
        setLandmark(partnerData.landmark || '');
        setContactPhone(partnerData.contact_phone || '');
      }

      setLoading(false);
    }
    load();
  }, [router]);

  // ── Photo upload ─────────────────────────────────────────────────────────────
  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `avatars/${userId}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('rozgar-uploads')
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;

      const { data } = supabase.storage.from('rozgar-uploads').getPublicUrl(path);
      const url = data.publicUrl;
      setAvatarUrl(url);

      // Save to auth metadata so it persists across sessions
      await supabase.auth.updateUser({ data: { avatar_url: url } });

      // Also save to workers.photo_url if worker
      if (role === 'worker') {
        await supabase.from('workers').update({ photo_url: url }).eq('user_id', userId);
      }

      toast.success('Photo updated!');
    } catch (err: any) {
      toast.error(err.message || 'Photo upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  // ── Save profile ─────────────────────────────────────────────────────────────
  async function handleSave() {
    if (!name.trim()) { toast.error('Name cannot be empty'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/profile/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          role,
          name,
          language,
          bio,
          pincode,
          selectedSkills,
          nodeName,
          address,
          contactPhone,
          landmark,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');

      // Customers: also persist pincode in auth metadata
      if (role === 'customer') {
        await supabase.auth.updateUser({ data: { pincode } });
      }

      toast.success('Profile saved!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  }

  function toggleSkill(skill: string) {
    setSelectedSkills(prev =>
      prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]
    );
  }

  function addCustomSkill() {
    const trimmed = customSkill.trim();
    if (!trimmed) return;
    if (!selectedSkills.includes(trimmed)) {
      setSelectedSkills(prev => [...prev, trimmed]);
    }
    setCustomSkill('');
    setShowCustomInput(false);
  }

  function goToDashboard() {
    if (role === 'customer') router.push('/customer/dashboard');
    else if (role === 'worker') router.push('/worker/dashboard');
    else if (role === 'partner_node') router.push('/partner/dashboard');
    else router.push('/');
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8F9F0]">
        <Loader2 className="size-8 animate-spin text-[#1B4332]" />
      </div>
    );
  }

  const roleLabel = role === 'worker' ? 'Worker' : role === 'partner_node' ? 'Partner Node' : 'Customer';
  const roleColor = role === 'worker' ? 'bg-blue-50 text-blue-600' : role === 'partner_node' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600';

  return (
    <div className={'min-h-screen bg-[#F8F9F0]'}>
      <div className="mx-auto max-w-[500px] px-6 py-10 space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={goToDashboard}
            className="flex items-center gap-2 text-sm font-bold text-zinc-400 hover:text-[#1B4332] transition-colors group"
          >
            <ArrowLeft className="size-4 group-hover:-translate-x-0.5 transition-transform" />
            Dashboard
          </button>
          <button
            onClick={async () => { await supabase.auth.signOut(); router.push('/login'); }}
            className="flex items-center gap-1.5 text-xs font-bold text-zinc-300 hover:text-red-400 transition-colors"
          >
            <LogOut className="size-4" />
            Sign Out
          </button>
        </div>

        {/* Avatar section */}
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="size-28 rounded-[32px] overflow-hidden bg-[#1B4332] flex items-center justify-center shadow-2xl shadow-[#1B4332]/20">
              {avatarUrl ? (
                <Image src={avatarUrl} alt="Profile" fill className="object-cover" unoptimized />
              ) : (
                <span className={'text-4xl font-black text-white [font-family:var(--font-heading)]'}>
                  {name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            {/* Camera button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute -bottom-2 -right-2 size-10 rounded-2xl bg-[#40C057] flex items-center justify-center shadow-lg shadow-[#40C057]/30 hover:bg-[#2f9e44] active:scale-95 transition-all"
            >
              {uploading ? (
                <Loader2 className="size-4 text-white animate-spin" />
              ) : (
                <Camera className="size-4 text-white" />
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={handlePhotoChange}
            />
          </div>

          <div className="text-center space-y-2">
            <h1 className={'text-2xl text-[#1B4332] [font-family:var(--font-heading)]'}>{name}</h1>
            <div className="flex items-center gap-2 justify-center">
              <span className={cn('text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full', roleColor)}>
                {roleLabel}
              </span>
              {phone && (
                <span className="text-xs font-bold text-zinc-400">{phone}</span>
              )}
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="space-y-5">

          {/* Name */}
          <Field label="Full Name" icon={<User className="size-4" />}>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              className="h-14 pl-10 rounded-2xl border-2 border-zinc-100 bg-white focus:border-[#40C057] font-bold"
            />
          </Field>

          {/* Language */}
          <Field label="Language" icon={<Languages className="size-4" />}>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger className="h-14 pl-10 rounded-2xl border-2 border-zinc-100 bg-white font-bold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-2xl">
                {['english','hindi','kannada','tamil','telugu','marathi','bengali'].map(l => (
                  <SelectItem key={l} value={l} className="capitalize">{l.charAt(0).toUpperCase() + l.slice(1)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {/* ── CUSTOMER ─────────────────────────────────────────────────── */}
          {role === 'customer' && (
            <Field label="Your Pincode" icon={<MapPin className="size-4" />}>
              <Input
                value={pincode}
                maxLength={6}
                onChange={e => setPincode(e.target.value.replace(/\D/g, ''))}
                className="h-14 pl-10 rounded-2xl border-2 border-zinc-100 bg-white focus:border-[#40C057] font-bold"
              />
            </Field>
          )}

          {/* ── WORKER ───────────────────────────────────────────────────── */}
          {role === 'worker' && (
            <>
              {/* Skills */}
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Skills</Label>
                <div className="flex flex-wrap gap-2 pt-1">
                  {SKILLS.map(skill => (
                    <button
                      key={skill}
                      type="button"
                      onClick={() => toggleSkill(skill)}
                      className={cn(
                        'px-3 py-2 rounded-xl text-xs font-bold border-2 transition-all',
                        selectedSkills.includes(skill)
                          ? 'bg-[#1B4332] text-white border-[#1B4332]'
                          : 'bg-white text-zinc-500 border-zinc-100 hover:border-zinc-300'
                      )}
                    >
                      {selectedSkills.includes(skill) && <CheckCircle2 className="inline size-3 mr-1 -mt-0.5" />}
                      {skill}
                    </button>
                  ))}

                  {/* Custom skills added by user */}
                  {selectedSkills.filter(s => !SKILLS.includes(s)).map(skill => (
                    <button
                      key={skill}
                      type="button"
                      onClick={() => toggleSkill(skill)}
                      className="px-3 py-2 rounded-xl text-xs font-bold border-2 bg-[#1B4332] text-white border-[#1B4332] shadow-md transition-all"
                    >
                      <CheckCircle2 className="inline size-3 mr-1 -mt-0.5" />
                      {skill}
                    </button>
                  ))}

                  {/* Other button */}
                  {!showCustomInput && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowCustomInput(true);
                        setTimeout(() => customSkillInputRef.current?.focus(), 50);
                      }}
                      className="px-3 py-2 rounded-xl text-xs font-bold border-2 border-dashed border-zinc-200 bg-white text-zinc-400 hover:border-[#40C057] hover:text-[#40C057] transition-all"
                    >
                      + Other
                    </button>
                  )}
                </div>

                {/* Inline custom skill input */}
                {showCustomInput && (
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      ref={customSkillInputRef}
                      type="text"
                      placeholder="e.g. Tile Fixing"
                      value={customSkill}
                      onChange={e => setCustomSkill(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') { e.preventDefault(); addCustomSkill(); }
                        if (e.key === 'Escape') { setShowCustomInput(false); setCustomSkill(''); }
                      }}
                      className="flex-1 h-10 px-4 rounded-xl border-2 border-[#40C057]/50 bg-white text-sm font-bold text-zinc-700 focus:outline-none focus:border-[#40C057]"
                    />
                    <button
                      type="button"
                      onClick={addCustomSkill}
                      className="h-10 px-4 rounded-xl bg-[#40C057] text-white text-sm font-black hover:bg-[#2f9e44] active:scale-95 transition-all"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowCustomInput(false); setCustomSkill(''); }}
                      className="h-10 px-3 rounded-xl bg-zinc-100 text-zinc-500 text-sm font-bold hover:bg-zinc-200 transition-all"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>

              <Field label="Work Pincode" icon={<MapPin className="size-4" />}>
                <Input
                  value={pincode}
                  maxLength={6}
                  onChange={e => setPincode(e.target.value.replace(/\D/g, ''))}
                  className="h-14 pl-10 rounded-2xl border-2 border-zinc-100 bg-white focus:border-[#40C057] font-bold"
                />
              </Field>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">About You</Label>
                <Textarea
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  placeholder="Your experience, specialties..."
                  className="min-h-[100px] rounded-2xl border-2 border-zinc-100 bg-white focus:border-[#40C057] p-4 font-medium resize-none"
                />
              </div>
            </>
          )}

          {/* ── PARTNER NODE ─────────────────────────────────────────────── */}
          {role === 'partner_node' && (
            <>
              <Field label="Agency / Shop Name" icon={<Store className="size-4" />}>
                <Input
                  value={nodeName}
                  onChange={e => setNodeName(e.target.value)}
                  className="h-14 pl-10 rounded-2xl border-2 border-zinc-100 bg-white focus:border-[#40C057] font-bold"
                />
              </Field>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Address</Label>
                <Textarea
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  className="min-h-[90px] rounded-2xl border-2 border-zinc-100 bg-white focus:border-[#40C057] p-4 font-medium resize-none"
                />
              </div>

              <Field label="Service Pincode" icon={<MapPin className="size-4" />}>
                <Input
                  value={pincode}
                  maxLength={6}
                  onChange={e => setPincode(e.target.value.replace(/\D/g, ''))}
                  className="h-14 pl-10 rounded-2xl border-2 border-zinc-100 bg-white focus:border-[#40C057] font-bold"
                />
              </Field>

              <Field label="Contact Number" icon={<Phone className="size-4" />}>
                <Input
                  value={contactPhone}
                  maxLength={10}
                  onChange={e => setContactPhone(e.target.value.replace(/\D/g, ''))}
                  className="h-14 pl-10 rounded-2xl border-2 border-zinc-100 bg-white focus:border-[#40C057] font-bold"
                />
              </Field>
            </>
          )}

          {/* Save Button */}
          <Button
            onClick={handleSave}
            disabled={saving}
            className="h-16 w-full rounded-2xl bg-[#1B4332] text-lg font-black text-white shadow-xl shadow-[#1B4332]/20 hover:bg-[#022c22] active:scale-[0.98] transition-all mt-2"
          >
            {saving ? <Loader2 className="animate-spin" /> : 'Save Changes'}
          </Button>

          <p className="text-center text-[10px] font-black uppercase tracking-[0.2em] text-zinc-300 pb-8">
            Rozgar — Secure Profile
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{label}</Label>
      <div className="relative">
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-300">{icon}</div>
        {children}
      </div>
    </div>
  );
}
