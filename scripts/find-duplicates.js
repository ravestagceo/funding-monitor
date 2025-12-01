/**
 * Find duplicate entries in funding_rates table
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function findDuplicates() {
  console.log('🔍 Finding Duplicate Entries...\n')
  console.log('='.repeat(70))

  try {
    // Get recent data for analysis (last 2 hours)
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()

    const { data: recentData, error } = await supabase
      .from('funding_rates')
      .select('id, symbol, exchange, funding_rate, created_at')
      .gte('created_at', twoHoursAgo)
      .order('created_at', { ascending: false })

    if (error) throw error

    console.log(`\n📊 Analyzing ${recentData.length.toLocaleString()} records from last 2 hours...\n`)

    // Group by symbol + exchange + minute
    const minuteGroups = new Map()

    recentData.forEach(row => {
      // Group by minute (not second) to find entries that should be unique
      const minute = row.created_at.substring(0, 16) // YYYY-MM-DD HH:MM
      const key = `${row.symbol}:${row.exchange}:${minute}`

      if (!minuteGroups.has(key)) {
        minuteGroups.set(key, [])
      }
      minuteGroups.get(key).push(row)
    })

    // Find duplicates
    const duplicates = []
    minuteGroups.forEach((entries, key) => {
      if (entries.length > 1) {
        duplicates.push({ key, count: entries.length, entries })
      }
    })

    console.log(`🔍 DUPLICATE ANALYSIS:`)
    console.log(`   Unique symbol+exchange+minute combinations: ${minuteGroups.size}`)
    console.log(`   Combinations with duplicates: ${duplicates.length}`)
    console.log(`   Duplication rate: ${((duplicates.length / minuteGroups.size) * 100).toFixed(1)}%`)

    if (duplicates.length > 0) {
      // Calculate average duplicates per entry
      const totalDuplicates = duplicates.reduce((sum, d) => sum + d.count, 0)
      const avgDuplicates = (totalDuplicates / duplicates.length).toFixed(2)

      console.log(`   Average duplicates per entry: ${avgDuplicates}`)

      // Count by duplicate amount
      const countByDuplicates = {}
      duplicates.forEach(d => {
        countByDuplicates[d.count] = (countByDuplicates[d.count] || 0) + 1
      })

      console.log(`\n   Breakdown by duplicate count:`)
      Object.entries(countByDuplicates)
        .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
        .forEach(([count, instances]) => {
          console.log(`      ${count}x duplicates: ${instances} entries`)
        })

      // Show sample duplicates
      console.log(`\n📋 Sample duplicates (first 10):`)
      duplicates.slice(0, 10).forEach((dup, i) => {
        const [symbol, exchange, minute] = dup.key.split(':')
        console.log(`\n   ${i + 1}. ${symbol} on ${exchange} at ${minute}:`)
        console.log(`      Count: ${dup.count} entries`)

        dup.entries.forEach((entry, j) => {
          console.log(`         [${j + 1}] ${entry.created_at} - Rate: ${entry.funding_rate} (ID: ${entry.id})`)
        })
      })

      // Check time distribution
      console.log(`\n⏰ TIME DISTRIBUTION OF DUPLICATES:`)
      const timeDistribution = {}
      duplicates.forEach(dup => {
        const minute = dup.key.split(':')[2]
        timeDistribution[minute] = (timeDistribution[minute] || 0) + 1
      })

      const sortedTimes = Object.entries(timeDistribution)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)

      console.log(`   Top 10 minutes with most duplicates:`)
      sortedTimes.forEach(([minute, count]) => {
        console.log(`      ${minute}: ${count} duplicate entries`)
      })

      // Calculate potential space savings
      const redundantEntries = totalDuplicates - duplicates.length
      const percentRedundant = ((redundantEntries / recentData.length) * 100).toFixed(1)

      console.log(`\n💾 SPACE WASTE ESTIMATE:`)
      console.log(`   Redundant entries in last 2h: ${redundantEntries}`)
      console.log(`   Percentage redundant: ${percentRedundant}%`)
      console.log(`   If this rate continues, ~${percentRedundant}% of database is wasted space`)

    } else {
      console.log(`\n   ✅ No duplicates found!`)
    }

  } catch (error) {
    console.error('❌ Error finding duplicates:', error.message)
    process.exit(1)
  }

  console.log('\n' + '='.repeat(70))
  console.log('✅ Analysis completed!')
}

findDuplicates()
