-- Migration: Add automatic cleanup for old data
-- Keeps only last 7 days to prevent database bloat

-- Create function to delete old funding rates
CREATE OR REPLACE FUNCTION cleanup_old_funding_rates()
RETURNS void AS $$
BEGIN
  -- Delete funding_rates older than 7 days
  DELETE FROM funding_rates
  WHERE created_at < NOW() - INTERVAL '7 days';

  -- Delete funding_spreads older than 7 days
  DELETE FROM funding_spreads
  WHERE created_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a scheduled job using pg_cron (if available)
-- Note: pg_cron extension needs to be enabled in Supabase dashboard
-- This runs daily at 3 AM UTC
-- If pg_cron is not available, you'll need to call this function from your cron job

-- Alternative: Call this function from your Next.js cron endpoint
COMMENT ON FUNCTION cleanup_old_funding_rates() IS 'Removes funding data older than 7 days to keep database size under control. Should be called daily.';
