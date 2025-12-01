const fs = require('fs')
const path = require('path')

// Load environment variables manually
const envPath = path.join(__dirname, '..', '.env.local')
const envFile = fs.readFileSync(envPath, 'utf8')
const env = {}
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/)
  if (match) {
    env[match[1]] = match[2]
  }
})

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

async function checkSupabaseHealth() {
  console.log('🔍 Checking Supabase Database Health...\n')
  console.log('=' .repeat(70))

  try {
    // Check 1: List all tables
    console.log('\n📊 TABLES:')
    const tablesQuery = `
      SELECT table_name, table_type
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `
    await runQuery('Tables', tablesQuery)

    // Check 2: funding_rates table structure
    console.log('\n📋 FUNDING_RATES TABLE STRUCTURE:')
    const fundingRatesColumns = `
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'funding_rates'
      ORDER BY ordinal_position;
    `
    await runQuery('Funding Rates Columns', fundingRatesColumns)

    // Check 3: funding_spreads table structure
    console.log('\n📋 FUNDING_SPREADS TABLE STRUCTURE:')
    const fundingSpreadsColumns = `
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'funding_spreads'
      ORDER BY ordinal_position;
    `
    await runQuery('Funding Spreads Columns', fundingSpreadsColumns)

    // Check 4: Row counts
    console.log('\n📈 ROW COUNTS:')
    const rowCounts = `
      SELECT
        (SELECT COUNT(*) FROM funding_rates) as funding_rates_count,
        (SELECT COUNT(*) FROM funding_spreads) as funding_spreads_count;
    `
    await runQuery('Row Counts', rowCounts)

    // Check 5: Recent data check
    console.log('\n🕐 RECENT DATA (Last 5 minutes):')
    const recentData = `
      SELECT
        'funding_rates' as table_name,
        COUNT(*) as recent_records
      FROM funding_rates
      WHERE created_at > NOW() - INTERVAL '5 minutes'
      UNION ALL
      SELECT
        'funding_spreads' as table_name,
        COUNT(*) as recent_records
      FROM funding_spreads
      WHERE created_at > NOW() - INTERVAL '5 minutes';
    `
    await runQuery('Recent Data', recentData)

    // Check 6: Indexes
    console.log('\n🔗 INDEXES:')
    const indexes = `
      SELECT
        tablename,
        indexname,
        indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
      ORDER BY tablename, indexname;
    `
    await runQuery('Indexes', indexes)

    // Check 7: Views
    console.log('\n👁️  VIEWS:')
    const views = `
      SELECT table_name
      FROM information_schema.views
      WHERE table_schema = 'public';
    `
    await runQuery('Views', views)

    // Check 8: RLS Policies
    console.log('\n🔒 ROW LEVEL SECURITY POLICIES:')
    const policies = `
      SELECT
        schemaname,
        tablename,
        policyname,
        permissive,
        roles,
        cmd
      FROM pg_policies
      WHERE schemaname = 'public'
      ORDER BY tablename, policyname;
    `
    await runQuery('RLS Policies', policies)

    // Check 9: Check for duplicate entries
    console.log('\n🔍 CHECKING FOR DUPLICATES:')
    const duplicates = `
      SELECT
        symbol,
        exchange,
        DATE_TRUNC('minute', created_at) as minute,
        COUNT(*) as count
      FROM funding_rates
      WHERE created_at > NOW() - INTERVAL '1 hour'
      GROUP BY symbol, exchange, DATE_TRUNC('minute', created_at)
      HAVING COUNT(*) > 1
      ORDER BY count DESC
      LIMIT 10;
    `
    await runQuery('Potential Duplicates', duplicates)

    // Check 10: Exchange coverage
    console.log('\n🏦 EXCHANGE COVERAGE (Recent data):')
    const exchangeCoverage = `
      SELECT
        exchange,
        COUNT(DISTINCT symbol) as unique_symbols,
        COUNT(*) as total_records,
        MAX(created_at) as latest_update
      FROM funding_rates
      WHERE created_at > NOW() - INTERVAL '1 hour'
      GROUP BY exchange
      ORDER BY exchange;
    `
    await runQuery('Exchange Coverage', exchangeCoverage)

    // Check 11: Data completeness in funding_spreads
    console.log('\n✅ FUNDING_SPREADS DATA COMPLETENESS (Last 10 records):')
    const dataCompleteness = `
      SELECT
        symbol,
        CASE WHEN binance_rate IS NOT NULL THEN '✓' ELSE '✗' END as binance,
        CASE WHEN lighter_rate IS NOT NULL THEN '✓' ELSE '✗' END as lighter,
        CASE WHEN hyperliquid_rate IS NOT NULL THEN '✓' ELSE '✗' END as hyperliquid,
        CASE WHEN bybit_rate IS NOT NULL THEN '✓' ELSE '✗' END as bybit,
        CASE WHEN mexc_rate IS NOT NULL THEN '✓' ELSE '✗' END as mexc,
        CASE WHEN aster_rate IS NOT NULL THEN '✓' ELSE '✗' END as aster,
        created_at
      FROM funding_spreads
      ORDER BY created_at DESC
      LIMIT 10;
    `
    await runQuery('Data Completeness', dataCompleteness)

    console.log('\n' + '='.repeat(70))
    console.log('✅ Health check completed!')

  } catch (error) {
    console.error('\n❌ Health check failed:', error.message)
    process.exit(1)
  }
}

async function runQuery(title, query) {
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`
      },
      body: JSON.stringify({ query })
    })

    if (!response.ok) {
      // Try alternative method - direct query via PostgREST
      const altResponse = await fetch(`${supabaseUrl}/rest/v1/?query=${encodeURIComponent(query)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Prefer': 'return=representation'
        }
      })

      if (!altResponse.ok) {
        console.log(`   ⚠️  Could not execute query for: ${title}`)
        console.log(`   Note: This requires direct database access`)
        return
      }
    }

    const result = await response.json()
    console.log(`   ✓ ${title}`)
    if (result && result.length > 0) {
      console.table(result)
    } else {
      console.log('   (No data)')
    }
  } catch (error) {
    console.log(`   ⚠️  Error in ${title}:`, error.message)
  }
}

checkSupabaseHealth()
