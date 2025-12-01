# Database Cleanup Guide

## Problem Summary

Your Supabase database is at **265% capacity (1.3 GB / 0.5 GB limit)** due to:

1. **No data retention policy** - Data accumulates indefinitely
2. **Duplicate entries** - 27% of the database is redundant duplicates
3. **High growth rate** - 754,000 records/day

### Current State
- **Total records**: 2,855,973 rows (in 3.8 days)
- **funding_rates**: 2,855,973 rows (~272 MB)
- **funding_spreads**: 247,588 rows (~35 MB)
- **Growth rate**: ~754k rows/day
- **Duplicates**: 27.1% of data
- **Problem**: Cron job runs 4x per minute instead of 1x

---

## Immediate Actions Required

### 1. Clean Up Old Data (Run Manually in Supabase)

Go to: https://supabase.com/dashboard/project/_/sql/new

Copy and run this SQL:

```sql
-- Delete data older than 3 days
DELETE FROM funding_rates WHERE created_at < NOW() - INTERVAL '3 days';
DELETE FROM funding_spreads WHERE created_at < NOW() - INTERVAL '3 days';
```

**Expected result**: Deletes ~780k rows, frees ~27% space

### 2. Set Up Automatic Cleanup Function

Run this SQL to create an automatic cleanup function:

```sql
-- See: supabase/migrations/add_automatic_cleanup.sql
CREATE OR REPLACE FUNCTION cleanup_old_funding_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM funding_rates WHERE created_at < NOW() - INTERVAL '7 days';
  DELETE FROM funding_spreads WHERE created_at < NOW() - INTERVAL '7 days';
  RAISE NOTICE 'Cleaned up funding data older than 7 days';
END;
$$;
```

Then call it weekly (manually or via cron):
```sql
SELECT cleanup_old_funding_data();
```

### 3. Fix Duplicate Cron Jobs (CRITICAL!)

**Problem**: The cron job at `/api/cron/update-funding` is being called 4 times per minute instead of 1 time.

**Check Vercel Cron Configuration**:

1. Go to Vercel Dashboard → Your Project → Settings → Cron Jobs
2. Check if there are multiple cron jobs pointing to the same endpoint
3. Verify the cron schedule is `* * * * *` (every minute) not more frequent

**Alternative**: Add deduplication to prevent parallel runs:

Create a lock mechanism in the cron endpoint to prevent simultaneous executions.

---

## Monitoring Scripts

Use these scripts to monitor database health:

```bash
# Check database size and growth
node scripts/check-database-size.js

# Analyze data patterns
node scripts/analyze-data-growth.js

# Find duplicate entries
node scripts/find-duplicates.js

# Cleanup old data (requires manual SQL execution)
node scripts/cleanup-old-data.js --dry-run --days=7
```

---

## Recommended Data Retention Policy

- **Last 7 days**: Keep all detailed (1-min interval) data
- **7-30 days**: Delete (or aggregate to hourly if needed later)
- **30+ days**: Delete entirely

This should keep database under 500 MB on free tier.

---

## Long-Term Solutions

1. **✅ Fix cron duplication** - **FIXED!** Added `cron-lock.ts` to prevent parallel runs
2. **Implement automatic cleanup** - Call cleanup function weekly
3. **Add database indexes** - Already in place, but verify
4. **Consider data aggregation** - For historical analysis, keep hourly/daily aggregates instead of all raw data
5. **Upgrade Supabase plan** - If you need more than 7 days of detailed data

---

## ✅ Applied Fixes

The following fixes have been applied to prevent future issues:

### 1. Cron Job Lock Mechanism
- **File**: `lib/cron-lock.ts`
- **Changes**: `app/api/cron/update-funding/route.ts`
- **Protection**: Prevents concurrent cron executions that cause duplicates
- **How it works**:
  - First request acquires lock
  - Subsequent requests return 409 Conflict
  - Lock auto-expires after 5 minutes

### 2. Monitoring Scripts
All scripts in `scripts/` folder:
- `check-database-size.js` - Analyze DB size and growth
- `analyze-data-growth.js` - Find what's causing growth
- `find-duplicates.js` - Detect duplicate entries
- `cleanup-old-data.js` - Delete old data with safety checks

See `scripts/README.md` for full documentation.

### 3. Next Steps After Deploy
1. Deploy the code changes (git push)
2. Run SQL cleanup in Supabase Dashboard
3. Monitor for 24 hours using `find-duplicates.js`
4. Verify duplicates are gone (should be 0%)

See `FIXES_APPLIED.md` for complete deployment guide.

---

## Estimated Impact

After cleanup:
- Database size: ~225 MB (down from 308 MB)
- Rows: ~2M (down from 2.8M)
- Daily growth: ~550k rows (down from 754k) if duplicates are fixed
- Time to fill 500MB: ~14 days (vs 7 days currently)

With weekly cleanup + duplicate fix:
- Stable database size under 500MB
- Sustainable on free tier
