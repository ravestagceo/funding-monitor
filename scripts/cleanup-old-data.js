/**
 * Cleanup old funding rate data to save database space
 *
 * Retention policy:
 * - Keep all data from last 7 days
 * - Delete everything older
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

const DRY_RUN = process.argv.includes('--dry-run')
const RETENTION_DAYS = parseInt(process.argv.find(arg => arg.startsWith('--days='))?.split('=')[1] || '7')

async function cleanupOldData() {
  console.log('🧹 Starting Database Cleanup...')
  console.log('='.repeat(70))
  console.log(`   Mode: ${DRY_RUN ? '🔍 DRY RUN (no changes)' : '⚠️  LIVE (will delete data)'}`)
  console.log(`   Retention: Keep last ${RETENTION_DAYS} days\n`)

  try {
    const cutoffDate = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000)
    console.log(`   Cutoff date: ${cutoffDate.toISOString()}\n`)

    // Check how much data will be deleted from funding_rates
    const { count: fundingRatesToDelete, error: countError1 } = await supabase
      .from('funding_rates')
      .select('*', { count: 'exact', head: true })
      .lt('created_at', cutoffDate.toISOString())

    if (countError1) throw countError1

    console.log(`📊 FUNDING_RATES TABLE:`)
    console.log(`   Records older than ${RETENTION_DAYS} days: ${fundingRatesToDelete?.toLocaleString() || 0}`)

    // Check how much data will be deleted from funding_spreads
    const { count: spreadToDelete, error: countError2 } = await supabase
      .from('funding_spreads')
      .select('*', { count: 'exact', head: true })
      .lt('created_at', cutoffDate.toISOString())

    if (countError2) throw countError2

    console.log(`\n📈 FUNDING_SPREADS TABLE:`)
    console.log(`   Records older than ${RETENTION_DAYS} days: ${spreadToDelete?.toLocaleString() || 0}`)

    // Get total counts before deletion
    const { count: totalRatesBefore } = await supabase
      .from('funding_rates')
      .select('*', { count: 'exact', head: true })

    const { count: totalSpreadsBefore } = await supabase
      .from('funding_spreads')
      .select('*', { count: 'exact', head: true })

    console.log(`\n📊 CURRENT TOTALS:`)
    console.log(`   funding_rates:   ${totalRatesBefore?.toLocaleString()} rows`)
    console.log(`   funding_spreads: ${totalSpreadsBefore?.toLocaleString()} rows`)

    const percentRates = totalRatesBefore > 0 ? ((fundingRatesToDelete / totalRatesBefore) * 100).toFixed(1) : 0
    const percentSpreads = totalSpreadsBefore > 0 ? ((spreadToDelete / totalSpreadsBefore) * 100).toFixed(1) : 0

    console.log(`\n🗑️  TO BE DELETED:`)
    console.log(`   funding_rates:   ${fundingRatesToDelete?.toLocaleString()} rows (${percentRates}%)`)
    console.log(`   funding_spreads: ${spreadToDelete?.toLocaleString()} rows (${percentSpreads}%)`)

    if (DRY_RUN) {
      console.log(`\n✅ DRY RUN COMPLETE - No data was deleted`)
      console.log(`   Run without --dry-run to actually delete data`)
    } else {
      console.log(`\n⚠️  WARNING: About to delete ${(fundingRatesToDelete + spreadToDelete).toLocaleString()} rows!`)
      console.log(`   Press Ctrl+C to cancel, or waiting 5 seconds to continue...`)

      await new Promise(resolve => setTimeout(resolve, 5000))

      console.log(`\n🗑️  Deleting old data...`)

      // Delete old funding_rates
      if (fundingRatesToDelete > 0) {
        const batchSize = 10000
        let deleted = 0

        while (deleted < fundingRatesToDelete) {
          const { error: deleteError1 } = await supabase
            .from('funding_rates')
            .delete()
            .lt('created_at', cutoffDate.toISOString())
            .limit(batchSize)

          if (deleteError1) throw deleteError1

          deleted += batchSize
          const progress = Math.min(100, (deleted / fundingRatesToDelete * 100).toFixed(1))
          process.stdout.write(`\r   funding_rates: ${progress}% complete`)

          // Check if done
          const { count: remaining } = await supabase
            .from('funding_rates')
            .select('*', { count: 'exact', head: true })
            .lt('created_at', cutoffDate.toISOString())

          if (remaining === 0) break
        }
        console.log(`\r   funding_rates: ✅ Deleted ${fundingRatesToDelete.toLocaleString()} rows`)
      }

      // Delete old funding_spreads
      if (spreadToDelete > 0) {
        const batchSize = 10000
        let deleted = 0

        while (deleted < spreadToDelete) {
          const { error: deleteError2 } = await supabase
            .from('funding_spreads')
            .delete()
            .lt('created_at', cutoffDate.toISOString())
            .limit(batchSize)

          if (deleteError2) throw deleteError2

          deleted += batchSize
          const progress = Math.min(100, (deleted / spreadToDelete * 100).toFixed(1))
          process.stdout.write(`\r   funding_spreads: ${progress}% complete`)

          // Check if done
          const { count: remaining } = await supabase
            .from('funding_spreads')
            .select('*', { count: 'exact', head: true })
            .lt('created_at', cutoffDate.toISOString())

          if (remaining === 0) break
        }
        console.log(`\r   funding_spreads: ✅ Deleted ${spreadToDelete.toLocaleString()} rows`)
      }

      // Get new totals
      const { count: totalRatesAfter } = await supabase
        .from('funding_rates')
        .select('*', { count: 'exact', head: true })

      const { count: totalSpreadsAfter } = await supabase
        .from('funding_spreads')
        .select('*', { count: 'exact', head: true })

      console.log(`\n📊 NEW TOTALS:`)
      console.log(`   funding_rates:   ${totalRatesAfter?.toLocaleString()} rows (${((totalRatesAfter / totalRatesBefore) * 100).toFixed(1)}% remaining)`)
      console.log(`   funding_spreads: ${totalSpreadsAfter?.toLocaleString()} rows (${((totalSpreadsAfter / totalSpreadsBefore) * 100).toFixed(1)}% remaining)`)

      console.log(`\n✅ Cleanup completed successfully!`)
    }

  } catch (error) {
    console.error('\n❌ Error during cleanup:', error.message)
    process.exit(1)
  }

  console.log('\n' + '='.repeat(70))
}

cleanupOldData()
