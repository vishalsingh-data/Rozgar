-- Initial migration for Rozgar gig marketplace

-- Enable pgcrypto for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Create ENUM Types
CREATE TYPE user_role AS ENUM ('customer', 'worker', 'partner_node');
CREATE TYPE language_preference AS ENUM ('english', 'hindi', 'kannada', 'tamil', 'telugu', 'malayalam');
CREATE TYPE worker_type AS ENUM ('skilled', 'semi_skilled', 'daily_wage', 'domestic', 'driver', 'other');
CREATE TYPE job_status AS ENUM ('pending', 'bidding', 'assigned', 'in_transit', 'on_site', 'renegotiating', 'complete', 'disputed', 'cancelled', 'expired');
CREATE TYPE ping_status AS ENUM ('pending', 'bid_placed', 'expired', 'ignored');
CREATE TYPE bid_source AS ENUM ('app', 'missed_call');
CREATE TYPE bid_status AS ENUM ('pending', 'accepted', 'rejected');
CREATE TYPE customer_decision AS ENUM ('pending', 'accepted', 'rejected');
CREATE TYPE strike_reason AS ENUM ('ghost', 'renegotiation_abuse', 'customer_complaint');
CREATE TYPE appeal_status AS ENUM ('pending', 'upheld', 'overturned');
CREATE TYPE ledger_status AS ENUM ('pending', 'paid');
CREATE TYPE warranty_status AS ENUM ('open', 'resolved', 'disputed');

-- 2. Create Tables

-- users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role user_role NOT NULL,
    phone VARCHAR UNIQUE NOT NULL,
    name VARCHAR,
    language_pref language_preference,
    created_at TIMESTAMP DEFAULT now(),
    is_active BOOLEAN DEFAULT true
);

-- workers
CREATE TABLE workers (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE SET NULL,
    type worker_type NOT NULL,
    raw_description TEXT,
    skill_tags TEXT[] DEFAULT '{}',
    searchable_as TEXT[] DEFAULT '{}',
    pincode VARCHAR,
    adjacent_pincodes TEXT[] DEFAULT '{}',
    rate_preference VARCHAR,
    availability_days TEXT[] DEFAULT '{}',
    photo_url VARCHAR,
    aadhar_verified BOOLEAN DEFAULT false,
    partner_node_id UUID REFERENCES users(id) ON DELETE SET NULL,
    strike_count INT DEFAULT 0,
    completion_rate FLOAT DEFAULT NULL,
    total_jobs INT DEFAULT 0,
    is_new BOOLEAN DEFAULT true,
    fcm_token VARCHAR,
    caller_id VARCHAR
);

-- jobs
CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES users(id) ON DELETE SET NULL,
    raw_description TEXT NOT NULL,
    interpreted_category VARCHAR,
    worker_tags_required TEXT[] DEFAULT '{}',
    ai_base_price INT,
    ai_confidence FLOAT,
    is_inspection BOOLEAN DEFAULT false,
    final_price INT,
    accepted_worker_id UUID REFERENCES users(id) ON DELETE SET NULL,
    status job_status DEFAULT 'pending',
    photo_url VARCHAR,
    pincode VARCHAR,
    sla_deadline TIMESTAMP,
    warranty_expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT now()
);

-- job_pings
CREATE TABLE job_pings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
    worker_id UUID REFERENCES users(id) ON DELETE SET NULL,
    status ping_status DEFAULT 'pending',
    sent_at TIMESTAMP DEFAULT now(),
    expires_at TIMESTAMP -- Usually 10 mins from sent_at
);

-- bids
CREATE TABLE bids (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
    worker_id UUID REFERENCES users(id) ON DELETE SET NULL,
    source bid_source NOT NULL,
    status bid_status DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT now()
);

-- renegotiations
CREATE TABLE renegotiations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
    old_price INT NOT NULL,
    new_price INT NOT NULL,
    new_photo_url VARCHAR,
    ai_verified BOOLEAN DEFAULT false,
    ai_note TEXT,
    customer_decision customer_decision DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT now()
);

-- strikes
CREATE TABLE strikes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_id UUID REFERENCES users(id) ON DELETE SET NULL,
    job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
    reason strike_reason NOT NULL,
    appealed BOOLEAN DEFAULT false,
    appeal_status appeal_status,
    appeal_note TEXT,
    created_at TIMESTAMP DEFAULT now()
);

-- partner_ledger
CREATE TABLE partner_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_node_id UUID REFERENCES users(id) ON DELETE SET NULL,
    job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
    worker_id UUID REFERENCES users(id) ON DELETE SET NULL,
    amount INT NOT NULL,
    status ledger_status DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT now()
);

-- warranty_claims
CREATE TABLE warranty_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES users(id) ON DELETE SET NULL,
    worker_id UUID REFERENCES users(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    status warranty_status DEFAULT 'open',
    created_at TIMESTAMP DEFAULT now()
);

-- 3. Enable RLS and Create Policies

-- List of tables to apply RLS and policy
-- users, workers, jobs, job_pings, bids, renegotiations, strikes, partner_ledger, warranty_claims

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY allow_all ON users FOR ALL USING (true);

ALTER TABLE workers ENABLE ROW LEVEL SECURITY;
CREATE POLICY allow_all ON workers FOR ALL USING (true);

ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY allow_all ON jobs FOR ALL USING (true);

ALTER TABLE job_pings ENABLE ROW LEVEL SECURITY;
CREATE POLICY allow_all ON job_pings FOR ALL USING (true);

ALTER TABLE bids ENABLE ROW LEVEL SECURITY;
CREATE POLICY allow_all ON bids FOR ALL USING (true);

ALTER TABLE renegotiations ENABLE ROW LEVEL SECURITY;
CREATE POLICY allow_all ON renegotiations FOR ALL USING (true);

ALTER TABLE strikes ENABLE ROW LEVEL SECURITY;
CREATE POLICY allow_all ON strikes FOR ALL USING (true);

ALTER TABLE partner_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY allow_all ON partner_ledger FOR ALL USING (true);

ALTER TABLE warranty_claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY allow_all ON warranty_claims FOR ALL USING (true);
