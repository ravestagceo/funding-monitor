-- Emergency cleanup: Remove old data to reduce database size
-- This script keeps only the last 7 days of data

-- Check current sizes before cleanup
SELECT
  'funding_rates' as table_name,
  COUNT(*) as total_rows,
  pg_size_pretty(pg_total_relation_size('funding_rates')) as total_size
FROM funding_rates
UNION ALL
SELECT
  'funding_spreads' as table_name,
  COUNT(*) as total_rows,
  pg_size_pretty(pg_total_relation_size('funding_spreads')) as total_size
FROM funding_spreads;

-- Delete funding_rates older than 7 days
DELETE FROM funding_rates
WHERE created_at < NOW() - INTERVAL '7 days';

-- Delete funding_spreads older than 7 days
DELETE FROM funding_spreads
WHERE created_at < NOW() - INTERVAL '7 days';

-- Vacuum tables to reclaim space
VACUUM FULL funding_rates;
VACUUM FULL funding_spreads;

-- Check sizes after cleanup
SELECT
  'funding_rates' as table_name,
  COUNT(*) as total_rows,
  pg_size_pretty(pg_total_relation_size('funding_rates')) as total_size
FROM funding_rates
UNION ALL
SELECT
  'funding_spreads' as table_name,
  COUNT(*) as total_rows,
  pg_size_pretty(pg_total_relation_size('funding_spreads')) as total_size
FROM funding_spreads;
