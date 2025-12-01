-- Automatic data cleanup function
-- This will keep only the last 7 days of detailed data

CREATE OR REPLACE FUNCTION cleanup_old_funding_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete funding_rates older than 7 days
  DELETE FROM funding_rates
  WHERE created_at < NOW() - INTERVAL '7 days';

  -- Delete funding_spreads older than 7 days
  DELETE FROM funding_spreads
  WHERE created_at < NOW() - INTERVAL '7 days';

  -- Log the cleanup
  RAISE NOTICE 'Cleaned up funding data older than 7 days';
END;
$$;

-- Note: To schedule this function to run automatically, you would need to:
-- 1. Enable pg_cron extension (if available on your Supabase plan)
-- 2. Create a cron job like:
--    SELECT cron.schedule('cleanup-old-data', '0 2 * * *', 'SELECT cleanup_old_funding_data()');
--
-- Or you can call this function manually/from an API endpoint:
--    SELECT cleanup_old_funding_data();
