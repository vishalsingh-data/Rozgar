-- IVR call log table for Twilio telephony feature

CREATE TABLE IF NOT EXISTS ivr_calls (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_sid      VARCHAR UNIQUE NOT NULL,
  caller_phone  VARCHAR NOT NULL,
  intent        VARCHAR,          -- 'worker_register' | 'customer_support' | 'partner_support'
  status        VARCHAR DEFAULT 'recording',  -- 'recording' | 'processing' | 'processed' | 'failed'
  recording_url VARCHAR,
  transcript    TEXT,
  extracted_data JSONB,
  created_at    TIMESTAMP DEFAULT now(),
  updated_at    TIMESTAMP DEFAULT now()
);
