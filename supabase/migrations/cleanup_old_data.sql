-- Clean up old data to free database space
-- This migration will delete all data older than 3 days

-- Delete old funding_rates (older than 3 days)
DELETE FROM funding_rates
WHERE created_at < NOW() - INTERVAL '3 days';

-- Delete old funding_spreads (older than 3 days)
DELETE FROM funding_spreads
WHERE created_at < NOW() - INTERVAL '3 days';

-- Vacuum to reclaim space (optional, will run automatically but we can suggest it)
-- Note: VACUUM FULL requires exclusive lock and might not work on Supabase
-- VACUUM ANALYZE funding_rates;
-- VACUUM ANALYZE funding_spreads;
