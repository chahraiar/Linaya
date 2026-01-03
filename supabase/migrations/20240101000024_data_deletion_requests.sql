-- Migration: Create data_deletion_requests table
-- Description: Store user requests for data deletion (RGPD compliance)

-- Create data_deletion_requests table in public schema
CREATE TABLE IF NOT EXISTS public.data_deletion_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email text NOT NULL,
  requested_at timestamptz DEFAULT now() NOT NULL,
  status text DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'cancelled')),
  processed_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_data_deletion_requests_user_id ON public.data_deletion_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_data_deletion_requests_status ON public.data_deletion_requests(status);
CREATE INDEX IF NOT EXISTS idx_data_deletion_requests_requested_at ON public.data_deletion_requests(requested_at);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_data_deletion_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_data_deletion_requests_updated_at
  BEFORE UPDATE ON public.data_deletion_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_data_deletion_requests_updated_at();

-- Enable RLS
ALTER TABLE public.data_deletion_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own deletion requests
CREATE POLICY "Users can view their own deletion requests"
  ON public.data_deletion_requests
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own deletion requests
CREATE POLICY "Users can create their own deletion requests"
  ON public.data_deletion_requests
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Grant permissions
GRANT SELECT, INSERT ON public.data_deletion_requests TO authenticated;
GRANT ALL ON public.data_deletion_requests TO service_role;

-- Add comment
COMMENT ON TABLE public.data_deletion_requests IS 'Stores user requests for data deletion (RGPD compliance)';
COMMENT ON COLUMN public.data_deletion_requests.status IS 'Status: pending, processing, completed, cancelled';

