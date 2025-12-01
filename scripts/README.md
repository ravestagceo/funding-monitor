# Database Maintenance Scripts

Scripts for monitoring and maintaining the Supabase database.

## Available Scripts

### 📊 Monitoring & Analysis

#### `check-database-size.js`
Analyzes database size, row counts, and growth patterns.

```bash
node scripts/check-database-size.js
```

**Output:**
- Total rows in each table
- Data span (oldest to newest records)
- Breakdown by time periods (1h, 24h, 7d, 30d)
- Estimated database size
- Growth rate projections
- Recommendations

#### `analyze-data-growth.js`
Analyzes what's causing database growth.

```bash
node scripts/analyze-data-growth.js
```

**Output:**
- Unique symbols tracked
- Records per exchange
- Expected vs actual growth
- Duplicate detection

#### `find-duplicates.js`
Finds duplicate entries in the database.

```bash
node scripts/find-duplicates.js
```

**Output:**
- Duplicate statistics
- Sample duplicate entries
- Time distribution of duplicates
- Space waste estimates

### 🧹 Cleanup Operations

#### `cleanup-old-data.js`
Deletes old data to free up database space.

```bash
# Dry run (preview what would be deleted)
node scripts/cleanup-old-data.js --dry-run --days=7

# Actually delete data (keeps last 7 days)
node scripts/cleanup-old-data.js --days=7

# Keep last 3 days
node scripts/cleanup-old-data.js --days=3
```

**Options:**
- `--dry-run`: Preview without deleting
- `--days=N`: Keep last N days (default: 7)

**Note:** May timeout on large datasets. If it fails, use the SQL migration instead.

### 🔄 Database Migrations

#### `run-migration.js`
Runs SQL migrations from the `supabase/migrations/` folder.

```bash
# Run specific migration
node scripts/run-migration.js cleanup_old_data.sql

# Run automatic cleanup setup
node scripts/run-migration.js add_automatic_cleanup.sql
```

**Note:** If this fails (no RPC function), copy the SQL manually to Supabase dashboard.

### 🔍 Database Health Check

#### `check-database-simple.js`
Quick health check of the database.

```bash
node scripts/check-database-simple.js
```

**Output:**
- Recent data samples
- Exchange coverage
- Data freshness
- Migration verification

### 🧪 Exchange Testing

#### `test-mexc.js`
Tests MEXC exchange API connectivity.

```bash
node scripts/test-mexc.js
```

## Quick Start

1. **Check database health:**
   ```bash
   node scripts/check-database-simple.js
   ```

2. **Analyze size and growth:**
   ```bash
   node scripts/check-database-size.js
   ```

3. **Find duplicates:**
   ```bash
   node scripts/find-duplicates.js
   ```

4. **Clean up old data (preview):**
   ```bash
   node scripts/cleanup-old-data.js --dry-run --days=7
   ```

5. **Actually clean up:**
   ```bash
   node scripts/cleanup-old-data.js --days=7
   ```

## Environment Variables

All scripts require these environment variables (from `.env.local`):

- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (for write operations)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Anon key (fallback for read operations)

## Recommended Maintenance Schedule

- **Daily**: Check database size
- **Weekly**: Clean up data older than 7 days
- **Monthly**: Analyze growth patterns and duplicates

## Troubleshooting

### "Missing Supabase credentials"
Make sure `.env.local` exists and contains the required variables.

### "Statement timeout" during cleanup
The dataset is too large. Use the SQL migration instead:
1. Go to Supabase dashboard → SQL Editor
2. Copy SQL from `supabase/migrations/cleanup_old_data.sql`
3. Run it manually

### Duplicates keep appearing
Check Vercel cron job configuration - it may be running multiple times per minute.
