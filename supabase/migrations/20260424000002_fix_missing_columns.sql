-- Fix missing columns that API routes reference but don't exist in the schema

-- strikes: appeal evidence photo URL (referenced in appeals route)
ALTER TABLE strikes ADD COLUMN IF NOT EXISTS appeal_evidence_url VARCHAR;

-- jobs: dispute mediation fields (referenced in partner resolve-dispute route)
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS mediation_notes TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS is_escalated BOOLEAN DEFAULT false;

-- warranty_claims: photo evidence (referenced in warranty claim route)
ALTER TABLE warranty_claims ADD COLUMN IF NOT EXISTS photo_url VARCHAR;

-- partner_nodes: add kyc_status and is_verified if not already present
-- (may already exist from add_partner_kyc_columns.sql — use IF NOT EXISTS to be safe)
ALTER TABLE partner_nodes ADD COLUMN IF NOT EXISTS kyc_status VARCHAR DEFAULT 'pending';
ALTER TABLE partner_nodes ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;
