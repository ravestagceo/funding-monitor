import { NextRequest, NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase'
import { fetchAllFundingRates } from '@/lib/exchanges'
import { tryAcquireLock, releaseLock } from '@/lib/cron-lock'
import type { FundingRateDB, FundingSpreadDB, ExchangeId } from '@/lib/types'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

const CRON_LOCK_KEY = 'update-funding-rates'

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Try to acquire lock to prevent concurrent executions
  if (!tryAcquireLock(CRON_LOCK_KEY)) {
    return NextResponse.json(
      {
        success: false,
        error: 'Another instance is already running',
        skipped: true,
      },
      { status: 409 }
    )
  }

  try {
    const supabase = getServiceSupabase()

    // Fetch rates from all exchanges using our fetcher functions
    const allRates = await fetchAllFundingRates()

    // Build records for database insertion
    const fundingRateRecords: FundingRateDB[] = []
    const symbolMaps = new Map<ExchangeId, Map<string, { hourlyRate: number; markPrice?: number; nextFundingTime?: number }>>()

    // Process each exchange's rates
    allRates.forEach((rates, exchange) => {
      const symbolMap = new Map<string, { hourlyRate: number; markPrice?: number; nextFundingTime?: number }>()

      rates.forEach((rate) => {
        fundingRateRecords.push({
          symbol: rate.symbol,
          exchange: rate.exchange,
          funding_rate: rate.fundingRate,
          funding_period_hours: rate.fundingPeriodHours,
          mark_price: rate.markPrice,
          next_funding_time: rate.nextFundingTime,
        })

        symbolMap.set(rate.symbol, {
          hourlyRate: rate.hourlyRate,
          markPrice: rate.markPrice,
          nextFundingTime: rate.nextFundingTime,
        })
      })

      symbolMaps.set(exchange, symbolMap)
    })

    // Insert all funding rates
    if (fundingRateRecords.length > 0) {
      const { error: insertError } = await supabase
        .from('funding_rates')
        .insert(fundingRateRecords)

      if (insertError) {
        console.error('Error inserting funding rates:', insertError)
      }
    }

    // Build spread records
    const spreadRecords: FundingSpreadDB[] = []

    // Get all unique symbols across all exchanges
    const allSymbols = new Set<string>()
    allRates.forEach((rates) => {
      rates.forEach((rate) => allSymbols.add(rate.symbol))
    })

    // Calculate spreads for symbols that exist on multiple exchanges
    allSymbols.forEach((symbol) => {
      const binance = symbolMaps.get('binance')?.get(symbol)
      const lighter = symbolMaps.get('lighter')?.get(symbol)
      const hyperliquid = symbolMaps.get('hyperliquid')?.get(symbol)
      const bybit = symbolMaps.get('bybit')?.get(symbol)
      const mexc = symbolMaps.get('mexc')?.get(symbol)
      const aster = symbolMaps.get('aster')?.get(symbol)

      // Need at least 2 exchanges for meaningful spread
      const availableExchanges = [binance, lighter, hyperliquid, bybit, mexc, aster].filter(Boolean).length
      if (availableExchanges < 2) return

      // Calculate max spread among all available pairs
      const rates: number[] = []
      if (binance) rates.push(binance.hourlyRate)
      if (lighter) rates.push(lighter.hourlyRate)
      if (hyperliquid) rates.push(hyperliquid.hourlyRate)
      if (bybit) rates.push(bybit.hourlyRate)
      if (mexc) rates.push(mexc.hourlyRate)
      if (aster) rates.push(aster.hourlyRate)

      let maxSpread = 0
      for (let i = 0; i < rates.length; i++) {
        for (let j = i + 1; j < rates.length; j++) {
          const spread = Math.abs(rates[i] - rates[j]) * 100
          if (spread > maxSpread) {
            maxSpread = spread
          }
        }
      }

      spreadRecords.push({
        symbol,
        binance_rate: binance?.hourlyRate || 0,
        lighter_rate: lighter?.hourlyRate || 0,
        hyperliquid_rate: hyperliquid?.hourlyRate,
        bybit_rate: bybit?.hourlyRate,
        mexc_rate: mexc?.hourlyRate,
        aster_rate: aster?.hourlyRate,
        spread_percent: maxSpread,
        binance_mark_price: binance?.markPrice,
      })
    })

    // Insert spreads
    if (spreadRecords.length > 0) {
      const { error: spreadError } = await supabase
        .from('funding_spreads')
        .insert(spreadRecords)

      if (spreadError) {
        console.error('Error inserting spreads:', spreadError)
      }
    }

    // Calculate stats
    const stats: Record<string, number> = {}
    allRates.forEach((rates, exchange) => {
      stats[`${exchange}Records`] = rates.length
    })
    stats.spreadRecords = spreadRecords.length

    return NextResponse.json({
      success: true,
      message: 'Funding rates updated successfully',
      stats,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Cron job error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  } finally {
    // Always release the lock
    releaseLock(CRON_LOCK_KEY)
  }
}
