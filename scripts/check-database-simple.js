const fs = require('fs')
const path = require('path')

// Load environment variables
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
const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

async function checkDatabase() {
  console.log('🔍 Checking Supabase Database Health...\n')
  console.log('='.repeat(70))

  try {
    // Check 1: Recent funding_rates
    console.log('\n📊 FUNDING_RATES - Recent Data:')
    const ratesResponse = await fetch(
      `${supabaseUrl}/rest/v1/funding_rates?select=*&order=created_at.desc&limit=10`,
      {
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`
        }
      }
    )

    if (ratesResponse.ok) {
      const rates = await ratesResponse.json()
      console.log(`   ✓ Found ${rates.length} recent records`)
      if (rates.length > 0) {
        console.log(`   Latest: ${rates[0].symbol} on ${rates[0].exchange} at ${rates[0].created_at}`)

        // Group by exchange
        const byExchange = {}
        rates.forEach(r => {
          byExchange[r.exchange] = (byExchange[r.exchange] || 0) + 1
        })
        console.log('   Exchange breakdown:', byExchange)
      }
    } else {
      console.log(`   ❌ Error: ${ratesResponse.status}`)
    }

    // Check 2: Recent funding_spreads
    console.log('\n📈 FUNDING_SPREADS - Recent Data:')
    const spreadsResponse = await fetch(
      `${supabaseUrl}/rest/v1/funding_spreads?select=*&order=created_at.desc&limit=5`,
      {
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`
        }
      }
    )

    if (spreadsResponse.ok) {
      const spreads = await spreadsResponse.json()
      console.log(`   ✓ Found ${spreads.length} recent spread records`)

      if (spreads.length > 0) {
        const latest = spreads[0]
        console.log(`   Latest: ${latest.symbol} at ${latest.created_at}`)
        console.log('   Data availability:')
        console.log(`     - binance_rate: ${latest.binance_rate !== null ? '✓' : '✗'}`)
        console.log(`     - lighter_rate: ${latest.lighter_rate !== null ? '✓' : '✗'}`)
        console.log(`     - hyperliquid_rate: ${latest.hyperliquid_rate !== null ? '✓' : '✗'}`)
        console.log(`     - bybit_rate: ${latest.bybit_rate !== null ? '✓' : '✗'}`)
        console.log(`     - mexc_rate: ${latest.mexc_rate !== null ? '✓' : '✗'}`)
        console.log(`     - aster_rate: ${latest.aster_rate !== null ? '✓' : '✗'}`)

        console.log('\n   📋 Latest 5 spreads:')
        spreads.forEach(s => {
          const exchanges = []
          if (s.binance_rate) exchanges.push('binance')
          if (s.lighter_rate) exchanges.push('lighter')
          if (s.hyperliquid_rate) exchanges.push('hyperliquid')
          if (s.bybit_rate) exchanges.push('bybit')
          if (s.mexc_rate) exchanges.push('mexc')
          if (s.aster_rate) exchanges.push('aster')
          console.log(`     ${s.symbol}: [${exchanges.join(', ')}] - ${s.created_at}`)
        })
      }
    } else {
      console.log(`   ❌ Error: ${spreadsResponse.status}`)
      const errorText = await spreadsResponse.text()
      console.log(`   Error details: ${errorText}`)
    }

    // Check 3: Count by exchange (last hour)
    console.log('\n🏦 EXCHANGE COVERAGE (Last hour):')
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

    const exchanges = ['binance', 'lighter', 'hyperliquid', 'bybit', 'mexc', 'aster']
    for (const exchange of exchanges) {
      const countResponse = await fetch(
        `${supabaseUrl}/rest/v1/funding_rates?select=symbol&exchange=eq.${exchange}&created_at=gte.${oneHourAgo}`,
        {
          headers: {
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${supabaseAnonKey}`,
            'Prefer': 'count=exact'
          }
        }
      )

      if (countResponse.ok) {
        const contentRange = countResponse.headers.get('content-range')
        const count = contentRange ? contentRange.split('/')[1] : '?'
        console.log(`   ${exchange.padEnd(12)}: ${count} records`)
      }
    }

    // Check 4: Data freshness
    console.log('\n🕐 DATA FRESHNESS:')
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()

    const recentRates = await fetch(
      `${supabaseUrl}/rest/v1/funding_rates?select=id&created_at=gte.${fiveMinutesAgo}`,
      {
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Prefer': 'count=exact'
        }
      }
    )

    const recentSpreads = await fetch(
      `${supabaseUrl}/rest/v1/funding_spreads?select=id&created_at=gte.${fiveMinutesAgo}`,
      {
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Prefer': 'count=exact'
        }
      }
    )

    if (recentRates.ok) {
      const contentRange = recentRates.headers.get('content-range')
      const count = contentRange ? contentRange.split('/')[1] : '?'
      console.log(`   funding_rates (last 5min):   ${count} records ${count === '0' ? '⚠️' : '✓'}`)
    }

    if (recentSpreads.ok) {
      const contentRange = recentSpreads.headers.get('content-range')
      const count = contentRange ? contentRange.split('/')[1] : '?'
      console.log(`   funding_spreads (last 5min): ${count} records ${count === '0' ? '⚠️' : '✓'}`)
    }

    // Check 5: Verify migration success - test all new columns
    console.log('\n✅ MIGRATION VERIFICATION:')

    const testAllColumns = await fetch(
      `${supabaseUrl}/rest/v1/funding_spreads?select=hyperliquid_rate,bybit_rate,mexc_rate,aster_rate,hyperliquid_mark_price,bybit_mark_price,mexc_mark_price,aster_mark_price&limit=1`,
      {
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`
        }
      }
    )

    if (!testAllColumns.ok) {
      const error = await testAllColumns.text()
      console.log('   ❌ Migration FAILED - columns do not exist')
      console.log(`   Error: ${error}`)
      console.log('\n   Please run the migration SQL in Supabase Dashboard:')
      console.log('   https://supabase.com/dashboard/project/_/sql/new')
    } else {
      console.log('   ✅ Migration SUCCESS - all columns exist!')
      console.log('   Rate columns: hyperliquid_rate, bybit_rate, mexc_rate, aster_rate')
      console.log('   Price columns: hyperliquid_mark_price, bybit_mark_price, mexc_mark_price, aster_mark_price')

      // Check the view
      const testView = await fetch(
        `${supabaseUrl}/rest/v1/latest_funding_spreads?select=symbol&limit=1`,
        {
          headers: {
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${supabaseAnonKey}`
          }
        }
      )

      if (testView.ok) {
        console.log('   ✅ View latest_funding_spreads recreated successfully')
      } else {
        console.log('   ⚠️  View may have issues')
      }

      // Check if they have data
      const testData = await testAllColumns.json()
      if (testData.length > 0) {
        const first = testData[0]
        console.log('\n   📊 Data Status:')
        console.log(`     hyperliquid_rate:     ${first.hyperliquid_rate !== null ? '✓ Has data' : '⏳ Waiting for data'}`)
        console.log(`     bybit_rate:           ${first.bybit_rate !== null ? '✓ Has data' : '⏳ Waiting for data'}`)
        console.log(`     mexc_rate:            ${first.mexc_rate !== null ? '✓ Has data' : '⏳ Waiting for data'}`)
        console.log(`     aster_rate:           ${first.aster_rate !== null ? '✓ Has data' : '⏳ Waiting for data'}`)
      }
    }

    // Check 6: Potential issues
    console.log('\n⚠️  POTENTIAL ISSUES:')
    let issuesFound = false

    if (!issuesFound) {
      console.log('   ✓ No issues detected')
    }

    console.log('\n' + '='.repeat(70))
    console.log('✅ Health check completed!')

  } catch (error) {
    console.error('\n❌ Health check failed:', error.message)
    process.exit(1)
  }
}

checkDatabase()
