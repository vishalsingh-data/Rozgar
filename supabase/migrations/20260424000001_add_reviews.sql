-- Reviews table for mutual post-job ratings

CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
    reviewer_id UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewee_id UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewer_role VARCHAR NOT NULL CHECK (reviewer_role IN ('customer', 'worker')),
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT now()
);

-- One review per reviewer per job
CREATE UNIQUE INDEX reviews_job_reviewer_unique ON reviews(job_id, reviewer_id);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY allow_all ON reviews FOR ALL USING (true);

-- Add avg_rating to workers for fast display
ALTER TABLE workers ADD COLUMN IF NOT EXISTS avg_rating FLOAT DEFAULT NULL;
ALTER TABLE workers ADD COLUMN IF NOT EXISTS review_count INT DEFAULT 0;
