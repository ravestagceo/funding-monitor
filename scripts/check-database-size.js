/**
 * Check database size and row counts
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkDatabaseSize() {
  console.log('🔍 Analyzing Database Size...\n')
  console.log('='.repeat(70))

  try {
    // Get total row count for funding_rates
    const { count: totalRates, error: ratesCountError } = await supabase
      .from('funding_rates')
      .select('*', { count: 'exact', head: true })

    if (ratesCountError) throw ratesCountError

    console.log(`\n📊 FUNDING_RATES TABLE:`)
    console.log(`   Total rows: ${totalRates?.toLocaleString() || 0}`)

    // Get oldest and newest records
    const { data: oldestRate } = await supabase
      .from('funding_rates')
      .select('created_at, symbol, exchange')
      .order('created_at', { ascending: true })
      .limit(1)
      .single()

    const { data: newestRate } = await supabase
      .from('funding_rates')
      .select('created_at, symbol, exchange')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (oldestRate && newestRate) {
      const ageInDays = (new Date(newestRate.created_at) - new Date(oldestRate.created_at)) / (1000 * 60 * 60 * 24)
      console.log(`   Oldest record: ${oldestRate.created_at} (${oldestRate.symbol} on ${oldestRate.exchange})`)
      console.log(`   Newest record: ${newestRate.created_at} (${newestRate.symbol} on ${newestRate.exchange})`)
      console.log(`   Data span: ${ageInDays.toFixed(2)} days`)
      console.log(`   Avg rows/day: ${(totalRates / ageInDays).toLocaleString('en-US', { maximumFractionDigits: 0 })}`)
    }

    // Check data by time periods
    const now = new Date()
    const periods = [
      { name: 'Last hour', hours: 1 },
      { name: 'Last 24 hours', hours: 24 },
      { name: 'Last 7 days', hours: 24 * 7 },
      { name: 'Last 30 days', hours: 24 * 30 },
    ]

    console.log(`\n   📅 Breakdown by period:`)
    for (const period of periods) {
      const cutoff = new Date(now.getTime() - period.hours * 60 * 60 * 1000).toISOString()
      const { count, error } = await supabase
        .from('funding_rates')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', cutoff)

      if (!error) {
        const percentage = totalRates > 0 ? ((count / totalRates) * 100).toFixed(1) : 0
        console.log(`      ${period.name.padEnd(15)}: ${count?.toLocaleString().padStart(10)} rows (${percentage}%)`)
      }
    }

    // Get total row count for funding_spreads
    const { count: totalSpreads, error: spreadsCountError } = await supabase
      .from('funding_spreads')
      .select('*', { count: 'exact', head: true })

    if (spreadsCountError) throw spreadsCountError

    console.log(`\n\n📈 FUNDING_SPREADS TABLE:`)
    console.log(`   Total rows: ${totalSpreads?.toLocaleString() || 0}`)

    // Get oldest and newest spreads
    const { data: oldestSpread } = await supabase
      .from('funding_spreads')
      .select('created_at, symbol')
      .order('created_at', { ascending: true })
      .limit(1)
      .single()

    const { data: newestSpread } = await supabase
      .from('funding_spreads')
      .select('created_at, symbol')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (oldestSpread && newestSpread) {
      const ageInDays = (new Date(newestSpread.created_at) - new Date(oldestSpread.created_at)) / (1000 * 60 * 60 * 24)
      console.log(`   Oldest record: ${oldestSpread.created_at} (${oldestSpread.symbol})`)
      console.log(`   Newest record: ${newestSpread.created_at} (${newestSpread.symbol})`)
      console.log(`   Data span: ${ageInDays.toFixed(2)} days`)
      console.log(`   Avg rows/day: ${(totalSpreads / ageInDays).toLocaleString('en-US', { maximumFractionDigits: 0 })}`)
    }

    console.log(`\n   📅 Breakdown by period:`)
    for (const period of periods) {
      const cutoff = new Date(now.getTime() - period.hours * 60 * 60 * 1000).toISOString()
      const { count, error } = await supabase
        .from('funding_spreads')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', cutoff)

      if (!error) {
        const percentage = totalSpreads > 0 ? ((count / totalSpreads) * 100).toFixed(1) : 0
        console.log(`      ${period.name.padEnd(15)}: ${count?.toLocaleString().padStart(10)} rows (${percentage}%)`)
      }
    }

    // Estimate data size
    console.log(`\n\n💾 ESTIMATED DATABASE SIZE:`)
    // Average row size estimates
    const avgRateRowBytes = 100 // id(8) + symbol(20) + exchange(15) + rates(16) + timestamps(16) + indexes
    const avgSpreadRowBytes = 150 // id(8) + symbol(20) + rates(48) + timestamps(8) + indexes

    const estimatedRatesSize = (totalRates * avgRateRowBytes) / (1024 * 1024)
    const estimatedSpreadsSize = (totalSpreads * avgSpreadRowBytes) / (1024 * 1024)
    const totalEstimated = estimatedRatesSize + estimatedSpreadsSize

    console.log(`   funding_rates:   ~${estimatedRatesSize.toFixed(2)} MB`)
    console.log(`   funding_spreads: ~${estimatedSpreadsSize.toFixed(2)} MB`)
    console.log(`   Total estimated: ~${totalEstimated.toFixed(2)} MB (${(totalEstimated / 1024).toFixed(2)} GB)`)
    console.log(`   ⚠️  This is a rough estimate. Actual size includes indexes, TOAST, and overhead.`)

    // Recommendations
    console.log(`\n\n💡 RECOMMENDATIONS:`)

    const rowsPerDay = totalRates / ((new Date(newestRate.created_at) - new Date(oldestRate.created_at)) / (1000 * 60 * 60 * 24))
    const daysToFillLimit = (500 * 1024 * 1024) / (rowsPerDay * avgRateRowBytes) // 500MB limit for free tier

    console.log(`   Current growth rate: ~${rowsPerDay.toLocaleString('en-US', { maximumFractionDigits: 0 })} rows/day`)
    console.log(`   At current rate, 500MB limit in: ~${daysToFillLimit.toFixed(0)} days`)

    if (totalRates > 1000000) {
      console.log(`   ⚠️  WARNING: Over 1M rows! Consider implementing data retention policy.`)
    }

    console.log(`\n   Suggested retention policies:`)
    console.log(`   • Keep detailed data (1-min intervals) for last 7 days`)
    console.log(`   • Keep hourly aggregates for last 30 days`)
    console.log(`   • Keep daily aggregates for last 365 days`)
    console.log(`   • Delete everything older than 365 days`)

  } catch (error) {
    console.error('❌ Error checking database:', error.message)
    process.exit(1)
  }

  console.log('\n' + '='.repeat(70))
  console.log('✅ Analysis completed!')
}

checkDatabaseSize()
