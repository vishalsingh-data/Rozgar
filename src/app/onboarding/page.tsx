'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Home,
  Wrench,
  Store,
  Loader2,
  ChevronRight,
  ArrowLeft,
  User,
  MapPin,
  Briefcase,
  Languages,
  Building2,
  FileText,
  Phone,
  CreditCard,
  Camera,
  CheckCircle2,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type Step = 'SELECT' | 'DETAILS';
type Role = 'customer' | 'worker' | 'partner_node';

const SKILLS = [
  'Electrician', 'Plumber', 'Carpenter', 'Painter',
  'AC Technician', 'Appliance Repair', 'Mason', 'Welder',
  'Cleaning', 'Cook/Chef', 'Driver', 'Security Guard',
  'Gardener', 'Daily Wage Labor',
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('SELECT');
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Common fields
  const [name, setName] = useState('');
  const [language, setLanguage] = useState('english');
  const [pincode, setPincode] = useState('');

  // Worker fields
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [bio, setBio] = useState('');
  const [customSkill, setCustomSkill] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const customSkillInputRef = React.useRef<HTMLInputElement>(null);
  const [landmark, setLandmark] = useState('');

  // Partner fields
  const [nodeName, setNodeName] = useState('');
  const [address, setAddress] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [aadharNumber, setAadharNumber] = useState('');
  const [businessRegNumber, setBusinessRegNumber] = useState('');
  const [shopLandmark, setShopLandmark] = useState('');

  useEffect(() => {
    async function checkUser() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }
      setUserId(session.user.id);
    }
    checkUser();
  }, [router]);

  const toggleSkill = (skill: string) => {
    setSelectedSkills(prev =>
      prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]
    );
  };

  const addCustomSkill = () => {
    const trimmed = customSkill.trim();
    if (!trimmed) return;
    if (!selectedSkills.includes(trimmed)) {
      setSelectedSkills(prev => [...prev, trimmed]);
    }
    setCustomSkill('');
    setShowCustomInput(false);
  };

  const handleRoleSelect = (selected: Role) => {
    setRole(selected);
    setStep('DETAILS');
  };

  const handleBack = () => {
    setStep('SELECT');
    setRole(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !role) return;

    if (!name.trim()) {
      toast.error('Please enter your name');
      return;
    }

    if (role === 'worker' && selectedSkills.length === 0) {
      toast.error('Please select at least one skill');
      return;
    }

    if (role === 'partner_node' && !nodeName.trim()) {
      toast.error('Please enter your agency / shop name');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          role,
          name: name.trim(),
          language,
          pincode,
          landmark,
          // Worker
          skills: selectedSkills,
          bio,
          workerType: selectedSkills[0]?.toLowerCase().replace(/ /g, '_') || 'skilled',
          // Partner
          nodeName,
          address,
          contactPhone,
          gstNumber,
          aadharNumber,
          businessRegNumber,
          shopLandmark,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save profile');

      toast.success('Profile created!');
      router.push(data.redirect ?? '/onboarding');
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || 'Failed to complete setup. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full flex-col items-center bg-[#F8F9F0] dark:bg-black font-sans">
      <div className="flex w-full max-w-[500px] flex-col px-6 py-12">

        {/* Header */}
        <div className="mb-10 space-y-3">
          {step === 'DETAILS' && (
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-sm font-bold text-zinc-400 hover:text-[#1B4332] transition-colors group mb-2"
            >
              <ArrowLeft className="size-4 group-hover:-translate-x-0.5 transition-transform" />
              BACK
            </button>
          )}
          <h1 className="text-4xl font-black leading-tight text-[#1B4332] dark:text-white">
            {step === 'SELECT' ? (
              <>Tell us,<br />who are you?</>
            ) : (
              <>Complete your<br />profile</>
            )}
          </h1>
          <p className="text-base font-medium text-zinc-400">
            {step === 'SELECT'
              ? 'Choose your role to get started with Rozgar'
              : `Set up your ${role === 'partner_node' ? 'partner node' : role} account`}
          </p>
        </div>

        {/* ── STEP 1: Role Selection ─────────────────────────────────────────── */}
        {step === 'SELECT' && (
          <div className="grid gap-4">
            <RoleCard
              title="I need work done"
              subtext="Book verified pros for home repairs & daily tasks"
              icon={<Home className="size-7" />}
              badge={null}
              onClick={() => handleRoleSelect('customer')}
              color="bg-emerald-50 text-emerald-600"
              accent="#40C057"
            />
            <RoleCard
              title="I want to find work"
              subtext="Get job alerts, earn with your skills, and build your reputation"
              icon={<Wrench className="size-7" />}
              badge="Can also book services"
              onClick={() => handleRoleSelect('worker')}
              color="bg-blue-50 text-blue-600"
              accent="#3b82f6"
            />
            <RoleCard
              title="I run a local agency"
              subtext="Onboard workers, manage fleet ops, earn from every job"
              icon={<Store className="size-7" />}
              badge="KYC required"
              onClick={() => handleRoleSelect('partner_node')}
              color="bg-amber-50 text-amber-600"
              accent="#f59e0b"
            />
          </div>
        )}

        {/* ── STEP 2: Role-Specific Details ─────────────────────────────────── */}
        {step === 'DETAILS' && (
          <form
            onSubmit={handleSubmit}
            className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-400"
          >
            {/* ── Common: Name ───────────────────────────────────────────── */}
            <FieldGroup label="Full Name" icon={<User />}>
              <Input
                id="name"
                placeholder="e.g. Rahul Sharma"
                value={name}
                onChange={e => setName(e.target.value)}
                className="h-14 pl-12 rounded-2xl border-2 border-zinc-100 bg-white focus:border-[#40C057] font-bold"
              />
            </FieldGroup>

            {/* ── Common: Language ───────────────────────────────────────── */}
            <FieldGroup label="Language Preference" icon={<Languages />}>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger className="h-14 pl-12 rounded-2xl border-2 border-zinc-100 bg-white font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl">
                  <SelectItem value="english">English</SelectItem>
                  <SelectItem value="hindi">Hindi</SelectItem>
                  <SelectItem value="kannada">Kannada</SelectItem>
                  <SelectItem value="tamil">Tamil</SelectItem>
                  <SelectItem value="telugu">Telugu</SelectItem>
                  <SelectItem value="marathi">Marathi</SelectItem>
                  <SelectItem value="bengali">Bengali</SelectItem>
                </SelectContent>
              </Select>
            </FieldGroup>

            {/* ════════════════════════════════════════════════════════════
                CUSTOMER FIELDS
            ════════════════════════════════════════════════════════════ */}
            {role === 'customer' && (
              <FieldGroup label="Your Pincode" icon={<MapPin />}>
                <Input
                  id="pincode"
                  placeholder="e.g. 560001"
                  maxLength={6}
                  value={pincode}
                  onChange={e => setPincode(e.target.value.replace(/\D/g, ''))}
                  className="h-14 pl-12 rounded-2xl border-2 border-zinc-100 bg-white focus:border-[#40C057] font-bold"
                />
              </FieldGroup>
            )}

            {/* ════════════════════════════════════════════════════════════
                WORKER FIELDS
            ════════════════════════════════════════════════════════════ */}
            {role === 'worker' && (
              <>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">
                    Your Skills <span className="text-zinc-300">(select all that apply)</span>
                  </Label>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {SKILLS.map(skill => (
                      <button
                        key={skill}
                        type="button"
                        onClick={() => toggleSkill(skill)}
                        className={cn(
                          'px-3 py-2 rounded-xl text-xs font-bold border-2 transition-all',
                          selectedSkills.includes(skill)
                            ? 'bg-[#1B4332] text-white border-[#1B4332] shadow-md'
                            : 'bg-white text-zinc-500 border-zinc-100 hover:border-zinc-300'
                        )}
                      >
                        {selectedSkills.includes(skill) && (
                          <CheckCircle2 className="inline size-3 mr-1 -mt-0.5" />
                        )}
                        {skill}
                      </button>
                    ))}

                    {/* Custom skills added by user */}
                    {selectedSkills
                      .filter(s => !SKILLS.includes(s))
                      .map(skill => (
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

                  {/* Custom skill input */}
                  {showCustomInput && (
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        ref={customSkillInputRef}
                        type="text"
                        placeholder="e.g. Tile Fixing"
                        value={customSkill}
                        onChange={e => setCustomSkill(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomSkill(); } if (e.key === 'Escape') { setShowCustomInput(false); setCustomSkill(''); } }}
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

                  {selectedSkills.length > 0 && (
                    <p className="text-[10px] text-[#40C057] font-bold ml-1">
                      {selectedSkills.length} skill{selectedSkills.length > 1 ? 's' : ''} selected
                    </p>
                  )}
                </div>

                {/* Pincode */}
                <FieldGroup label="Work Location (Pincode)" icon={<MapPin />}>
                  <Input
                    id="pincode"
                    placeholder="e.g. 560001"
                    maxLength={6}
                    value={pincode}
                    onChange={e => setPincode(e.target.value.replace(/\D/g, ''))}
                    className="h-14 pl-12 rounded-2xl border-2 border-zinc-100 bg-white focus:border-[#40C057] font-bold"
                  />
                </FieldGroup>

                {/* Bio */}
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">
                    About You
                  </Label>
                  <Textarea
                    id="bio"
                    placeholder="Briefly describe your experience, years in trade, any specialties..."
                    value={bio}
                    onChange={e => setBio(e.target.value)}
                    className="min-h-[110px] rounded-2xl border-2 border-zinc-100 bg-white focus:border-[#40C057] p-4 font-medium resize-none"
                  />
                </div>
              </>
            )}

            {/* ════════════════════════════════════════════════════════════
                PARTNER NODE FIELDS
            ════════════════════════════════════════════════════════════ */}
            {role === 'partner_node' && (
              <>
                {/* KYC Notice */}
                <div className="rounded-2xl bg-amber-50 border-2 border-amber-100 p-4 space-y-1">
                  <p className="text-xs font-black uppercase tracking-widest text-amber-600">
                    KYC Required
                  </p>
                  <p className="text-sm font-medium text-amber-700 leading-relaxed">
                    Your application will be reviewed by our team. You'll be notified once approved and can start operating.
                  </p>
                </div>

                {/* Agency / Shop Name */}
                <FieldGroup label="Agency / Shop Name" icon={<Store />}>
                  <Input
                    id="nodeName"
                    placeholder="e.g. Shiv Service Agencies"
                    value={nodeName}
                    onChange={e => setNodeName(e.target.value)}
                    className="h-14 pl-12 rounded-2xl border-2 border-zinc-100 bg-white focus:border-[#40C057] font-bold"
                  />
                </FieldGroup>

                {/* Full Address */}
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">
                    Full Shop / Office Address
                  </Label>
                  <Textarea
                    id="address"
                    placeholder="Building, Street, Area, City..."
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    className="min-h-[90px] rounded-2xl border-2 border-zinc-100 bg-white focus:border-[#40C057] p-4 font-medium resize-none"
                  />
                </div>

                {/* Pincode */}
                <FieldGroup label="Pincode (Service Area)" icon={<MapPin />}>
                  <Input
                    id="pincode"
                    placeholder="e.g. 560001"
                    maxLength={6}
                    value={pincode}
                    onChange={e => setPincode(e.target.value.replace(/\D/g, ''))}
                    className="h-14 pl-12 rounded-2xl border-2 border-zinc-100 bg-white focus:border-[#40C057] font-bold"
                  />
                </FieldGroup>

                {/* Landmark */}
                <FieldGroup label="Shop Landmark / Directions" icon={<MapPin />}>
                  <Input
                    id="shopLandmark"
                    placeholder="e.g. Behind HDFC Bank, MG Road"
                    value={shopLandmark}
                    onChange={e => setShopLandmark(e.target.value)}
                    className="h-14 pl-12 rounded-2xl border-2 border-zinc-100 bg-white focus:border-[#40C057] font-bold"
                  />
                </FieldGroup>

                {/* Contact Phone */}
                <FieldGroup label="Business Contact Number" icon={<Phone />}>
                  <Input
                    id="contactPhone"
                    type="tel"
                    placeholder="10-digit mobile number"
                    maxLength={10}
                    value={contactPhone}
                    onChange={e => setContactPhone(e.target.value.replace(/\D/g, ''))}
                    className="h-14 pl-12 rounded-2xl border-2 border-zinc-100 bg-white focus:border-[#40C057] font-bold tracking-widest"
                  />
                </FieldGroup>

                <div className="space-y-1.5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">
                    Verification Documents
                  </p>
                  <div className="rounded-2xl border-2 border-zinc-100 bg-white p-1 divide-y divide-zinc-50">

                    {/* GST */}
                    <div className="flex items-center gap-3 p-3">
                      <div className="size-8 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                        <FileText className="size-4 text-emerald-500" />
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px] font-black uppercase text-zinc-400">GST Number</p>
                        <Input
                          placeholder="22AAAAA0000A1Z5"
                          value={gstNumber}
                          onChange={e => setGstNumber(e.target.value.toUpperCase())}
                          className="mt-1 h-9 border-0 border-b border-zinc-100 rounded-none bg-transparent px-0 font-bold text-sm focus-visible:ring-0 focus-visible:border-[#40C057]"
                        />
                      </div>
                    </div>

                    {/* Aadhar */}
                    <div className="flex items-center gap-3 p-3">
                      <div className="size-8 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                        <CreditCard className="size-4 text-blue-500" />
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px] font-black uppercase text-zinc-400">Aadhar Number</p>
                        <Input
                          placeholder="XXXX XXXX XXXX"
                          maxLength={14}
                          value={aadharNumber}
                          onChange={e => {
                            const raw = e.target.value.replace(/\D/g, '').slice(0, 12);
                            setAadharNumber(raw.replace(/(\d{4})(?=\d)/g, '$1 '));
                          }}
                          className="mt-1 h-9 border-0 border-b border-zinc-100 rounded-none bg-transparent px-0 font-bold text-sm tracking-widest focus-visible:ring-0 focus-visible:border-[#40C057]"
                        />
                      </div>
                    </div>

                    {/* Business Reg */}
                    <div className="flex items-center gap-3 p-3">
                      <div className="size-8 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
                        <Building2 className="size-4 text-purple-500" />
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px] font-black uppercase text-zinc-400">Business Reg. Number <span className="text-zinc-300 normal-case font-medium">(optional)</span></p>
                        <Input
                          placeholder="e.g. U74900KA2020PTC123456"
                          value={businessRegNumber}
                          onChange={e => setBusinessRegNumber(e.target.value.toUpperCase())}
                          className="mt-1 h-9 border-0 border-b border-zinc-100 rounded-none bg-transparent px-0 font-bold text-sm focus-visible:ring-0 focus-visible:border-[#40C057]"
                        />
                      </div>
                    </div>

                    {/* Shop Photo placeholder */}
                    <div className="flex items-center gap-3 p-3">
                      <div className="size-8 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
                        <Camera className="size-4 text-orange-500" />
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px] font-black uppercase text-zinc-400">Shop / Office Photo</p>
                        <p className="text-xs text-zinc-400 mt-0.5">You can upload this after approval from your dashboard.</p>
                      </div>
                    </div>

                  </div>
                </div>
              </>
            )}

            {/* Submit */}
            <Button
              type="submit"
              disabled={loading}
              className="h-16 w-full rounded-2xl bg-[#1B4332] text-lg font-black text-white shadow-xl shadow-[#1B4332]/20 hover:bg-[#022c22] active:scale-[0.98] transition-all"
            >
              {loading ? (
                <Loader2 className="animate-spin" />
              ) : role === 'partner_node' ? (
                'Submit Application'
              ) : (
                'Complete Setup'
              )}
              {!loading && <ChevronRight className="ml-2 size-5" />}
            </Button>

            <p className="text-center text-[10px] font-black uppercase tracking-[0.2em] text-zinc-300">
              Secure Identity by Rozgar HQ
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function FieldGroup({
  label,
  icon,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">
        {label}
      </Label>
      <div className="relative">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-zinc-300 [&>svg]:size-5">
          {icon}
        </div>
        {children}
      </div>
    </div>
  );
}

function RoleCard({
  title,
  subtext,
  icon,
  badge,
  onClick,
  color,
  accent,
}: {
  title: string;
  subtext: string;
  icon: React.ReactNode;
  badge: string | null;
  onClick: () => void;
  color: string;
  accent: string;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left outline-none group active:scale-[0.98] transition-all"
    >
      <Card className="overflow-hidden border-2 border-zinc-100 bg-white shadow-sm transition-all group-hover:shadow-lg group-hover:border-zinc-200 dark:bg-zinc-900">
        <CardContent className="flex items-center gap-5 p-6">
          <div className={cn('flex size-16 shrink-0 items-center justify-center rounded-2xl transition-colors', color)}>
            {icon}
          </div>
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-black text-[#1B4332] dark:text-white leading-tight">
                {title}
              </h3>
              {badge && (
                <span
                  className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: `${accent}15`, color: accent }}
                >
                  {badge}
                </span>
              )}
            </div>
            <p className="text-xs font-medium text-zinc-400 leading-relaxed">{subtext}</p>
          </div>
          <ChevronRight className="size-5 shrink-0 text-zinc-200 group-hover:text-[#1B4332] group-hover:translate-x-0.5 transition-all" />
        </CardContent>
      </Card>
    </button>
  );
}
