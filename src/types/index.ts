// ─────────────────────────────────────────────
// Shared / Utility Types
// ─────────────────────────────────────────────

export type UserRole = 'customer' | 'worker' | 'partner_node';

export type JobStatus =
  | 'pending'
  | 'bidding'
  | 'assigned'
  | 'in_transit'
  | 'on_site'
  | 'renegotiating'
  | 'complete'
  | 'disputed'
  | 'cancelled'
  | 'expired';

// ─────────────────────────────────────────────
// users
// ─────────────────────────────────────────────

export interface User {
  id: string;
  role: UserRole;
  phone: string;
  name: string;
  language_pref:
    | 'english'
    | 'hindi'
    | 'kannada'
    | 'tamil'
    | 'telugu'
    | 'malayalam';
  created_at: string;
  is_active: boolean;
}

// ─────────────────────────────────────────────
// workers
// ─────────────────────────────────────────────

export interface Worker {
  user_id: string;
  type: 'skilled' | 'semi_skilled' | 'daily_wage' | 'domestic' | 'driver' | 'other';
  raw_description: string;
  skill_tags: string[];
  searchable_as: string[];
  pincode: string;
  adjacent_pincodes: string[];
  rate_preference: string;
  availability_days: string[];
  photo_url: string | null;
  aadhar_verified: boolean;
  partner_node_id: string | null;
  strike_count: number;
  completion_rate: number | null;
  total_jobs: number;
  is_new: boolean;
  fcm_token: string | null;
  caller_id: string | null;
}

// ─────────────────────────────────────────────
// jobs
// ─────────────────────────────────────────────

export interface Job {
  id: string;
  customer_id: string;
  raw_description: string;
  interpreted_category: string;
  worker_tags_required: string[];
  ai_base_price: number | null;
  ai_confidence: number;
  is_inspection: boolean;
  final_price: number | null;
  accepted_worker_id: string | null;
  status: JobStatus;
  photo_url: string | null;
  pincode: string;
  sla_deadline: string | null;
  warranty_expires_at: string | null;
  created_at: string;
}

// ─────────────────────────────────────────────
// job_pings
// ─────────────────────────────────────────────

export interface JobPing {
  id: string;
  job_id: string;
  worker_id: string;
  status: 'pending' | 'bid_placed' | 'expired' | 'ignored';
  sent_at: string;
  expires_at: string;
}

// ─────────────────────────────────────────────
// bids
// ─────────────────────────────────────────────

export interface Bid {
  id: string;
  job_id: string;
  worker_id: string;
  source: 'app' | 'missed_call';
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
}

// ─────────────────────────────────────────────
// renegotiations
// ─────────────────────────────────────────────

export interface Renegotiation {
  id: string;
  job_id: string;
  old_price: number;
  new_price: number;
  new_photo_url: string;
  ai_verified: boolean;
  ai_note: string;
  customer_decision: 'pending' | 'accepted' | 'rejected';
  created_at: string;
}

// ─────────────────────────────────────────────
// strikes
// ─────────────────────────────────────────────

export interface Strike {
  id: string;
  worker_id: string;
  job_id: string;
  reason: 'ghost' | 'renegotiation_abuse' | 'customer_complaint';
  appealed: boolean;
  appeal_status: 'pending' | 'upheld' | 'overturned' | null;
  appeal_note: string | null;
  created_at: string;
}

// ─────────────────────────────────────────────
// partner_ledger
// ─────────────────────────────────────────────

export interface PartnerLedger {
  id: string;
  partner_node_id: string;
  job_id: string;
  worker_id: string;
  amount: number;
  status: 'pending' | 'paid';
  created_at: string;
}

// ─────────────────────────────────────────────
// warranty_claims
// ─────────────────────────────────────────────

export interface WarrantyClaim {
  id: string;
  job_id: string;
  customer_id: string;
  worker_id: string;
  description: string;
  status: 'open' | 'resolved' | 'disputed';
  created_at: string;
}
