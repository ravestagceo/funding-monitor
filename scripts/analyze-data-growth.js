/**
 * Analyze what's causing database growth
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function analyzeDataGrowth() {
  console.log('🔍 Analyzing Data Growth Patterns...\n')
  console.log('='.repeat(70))

  try {
    // Count unique symbols
    const { data: symbolsData, error: symbolsError } = await supabase
      .from('funding_rates')
      .select('symbol')
      .order('symbol')

    if (symbolsError) throw symbolsError

    const uniqueSymbols = new Set(symbolsData.map(r => r.symbol))
    console.log(`\n📊 UNIQUE SYMBOLS: ${uniqueSymbols.size}`)
    console.log(`   Symbols tracked: ${Array.from(uniqueSymbols).sort().join(', ')}`)

    // Count by exchange
    console.log(`\n\n🏦 DATA BY EXCHANGE (Last 24h):`)
    const exchanges = ['binance', 'lighter', 'hyperliquid', 'bybit', 'mexc', 'aster']
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    let totalLast24h = 0
    for (const exchange of exchanges) {
      const { count, error } = await supabase
        .from('funding_rates')
        .select('*', { count: 'exact', head: true })
        .eq('exchange', exchange)
        .gte('created_at', last24h)

      if (!error) {
        totalLast24h += count || 0
        const rowsPerMin = ((count || 0) / (24 * 60)).toFixed(1)
        console.log(`   ${exchange.padEnd(12)}: ${String(count || 0).padStart(7)} rows (${rowsPerMin} rows/min)`)
      }
    }

    console.log(`   ${'TOTAL'.padEnd(12)}: ${String(totalLast24h).padStart(7)} rows in last 24h`)

    // Calculate expected growth
    const symbolsPerExchange = {
      binance: uniqueSymbols.size,
      lighter: Math.min(uniqueSymbols.size, 50), // Estimate
      hyperliquid: uniqueSymbols.size,
      bybit: uniqueSymbols.size,
      mexc: uniqueSymbols.size,
      aster: Math.min(uniqueSymbols.size, 50), // Estimate
    }

    console.log(`\n\n📈 GROWTH CALCULATION:`)
    console.log(`   Unique symbols: ${uniqueSymbols.size}`)
    console.log(`   Exchanges: ${exchanges.length}`)
    console.log(`   Fetch interval: 1 minute`)
    console.log(`   Expected rows/min: ${uniqueSymbols.size} symbols × ${exchanges.length} exchanges = ${uniqueSymbols.size * exchanges.length}`)
    console.log(`   Expected rows/hour: ${uniqueSymbols.size * exchanges.length * 60}`)
    console.log(`   Expected rows/day: ${uniqueSymbols.size * exchanges.length * 60 * 24}`)

    // Check for duplicate data
    console.log(`\n\n🔍 CHECKING FOR DUPLICATES:`)

    // Sample check: Get records from last hour and check for duplicates
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const { data: recentData, error: recentError } = await supabase
      .from('funding_rates')
      .select('symbol, exchange, funding_rate, created_at')
      .gte('created_at', oneHourAgo)
      .order('created_at', { ascending: false })

    if (!recentError && recentData) {
      // Group by symbol + exchange + minute
      const groupedByMinute = {}
      recentData.forEach(row => {
        const minute = row.created_at.substring(0, 16) // YYYY-MM-DD HH:MM
        const key = `${row.symbol}:${row.exchange}:${minute}`
        groupedByMinute[key] = (groupedByMinute[key] || 0) + 1
      })

      const duplicates = Object.entries(groupedByMinute).filter(([_, count]) => count > 1)

      if (duplicates.length > 0) {
        console.log(`   ⚠️  Found ${duplicates.length} minutes with duplicate entries!`)
        console.log(`   Sample duplicates:`)
        duplicates.slice(0, 5).forEach(([key, count]) => {
          console.log(`      ${key}: ${count} entries`)
        })
      } else {
        console.log(`   ✅ No duplicate entries found in last hour`)
      }
    }

    // Check spreads table
    console.log(`\n\n📊 FUNDING_SPREADS ANALYSIS:`)
    const { count: spreadsLast24h, error: spreadsError } = await supabase
      .from('funding_spreads')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', last24h)

    if (!spreadsError) {
      const spreadsPerMin = (spreadsLast24h / (24 * 60)).toFixed(1)
      console.log(`   Last 24h: ${spreadsLast24h} rows (${spreadsPerMin} rows/min)`)
      console.log(`   Expected: ~${uniqueSymbols.size} rows/min (1 per symbol)`)

      if (spreadsPerMin > uniqueSymbols.size * 1.5) {
        console.log(`   ⚠️  Spreads are being created too frequently!`)
      }
    }

  } catch (error) {
    console.error('❌ Error analyzing data:', error.message)
    process.exit(1)
  }

  console.log('\n' + '='.repeat(70))
  console.log('✅ Analysis completed!')
}

analyzeDataGrowth()
