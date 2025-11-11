-- Add debug columns to pricing_runs table
ALTER TABLE pricing_runs
ADD COLUMN IF NOT EXISTS debug_mode BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS debug_screenshots JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS debug_html_snapshots JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS debug_logs TEXT[],
ADD COLUMN IF NOT EXISTS button_scan_results JSONB;

COMMENT ON COLUMN pricing_runs.debug_mode IS 'Enable verbose logging and screenshot capture at every step';
COMMENT ON COLUMN pricing_runs.debug_screenshots IS 'Array of screenshot URLs with metadata: [{step, description, url, timestamp}]';
COMMENT ON COLUMN pricing_runs.debug_html_snapshots IS 'Array of HTML snapshot URLs with metadata: [{step, description, url, timestamp}]';
COMMENT ON COLUMN pricing_runs.debug_logs IS 'Array of detailed log messages from the scraper';
COMMENT ON COLUMN pricing_runs.button_scan_results IS 'List of all buttons found when View Rates button fails';

-- Ensure scraper-debug bucket exists with proper configuration
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'scraper-debug',
  'scraper-debug',
  true,
  10485760, -- 10MB limit
  ARRAY['image/png', 'text/html', 'text/plain']
)
ON CONFLICT (id) DO UPDATE
SET 
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/png', 'text/html', 'text/plain'];

-- RLS policies for scraper-debug bucket
DO $$ 
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Allow authenticated users to upload debug files" ON storage.objects;
  DROP POLICY IF EXISTS "Allow public read access to debug files" ON storage.objects;
END $$;

CREATE POLICY "Allow authenticated users to upload debug files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'scraper-debug');

CREATE POLICY "Allow public read access to debug files"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'scraper-debug');