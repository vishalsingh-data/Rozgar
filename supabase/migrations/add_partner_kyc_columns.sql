-- ============================================================
-- Rozgar: Create partner_nodes table
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS public.partner_nodes (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name                 TEXT NOT NULL,
  pincode              TEXT,
  address              TEXT,
  landmark             TEXT,
  contact_phone        TEXT,
  gst_number           TEXT,
  aadhar_number        TEXT,
  business_reg_number  TEXT,
  shop_photo_url       TEXT,
  kyc_status           TEXT NOT NULL DEFAULT 'pending',
  is_verified          BOOLEAN NOT NULL DEFAULT FALSE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT partner_nodes_owner_id_key UNIQUE (owner_id)
);

-- Enable RLS
ALTER TABLE public.partner_nodes ENABLE ROW LEVEL SECURITY;

-- Owner can read/write their own node
CREATE POLICY "Partner can manage own node"
  ON public.partner_nodes
  FOR ALL
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- Service role has full access (for server-side admin operations)
CREATE POLICY "Service role full access"
  ON public.partner_nodes
  FOR ALL
  TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

-- Verify table was created
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'partner_nodes'
ORDER BY ordinal_position;
