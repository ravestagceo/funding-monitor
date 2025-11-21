import { NextRequest, NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase'
import type {
  BinanceFundingRate,
  LighterFundingRate,
  BybitTickersResponse,
  FundingRateDB,
  FundingSpreadDB,
  ExchangeId,
} from '@/lib/types'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

interface NormalizedRate {
  symbol: string
  rate: number
  hourlyRate: number
  markPrice?: number
  nextFundingTime?: number
}

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = getServiceSupabase()

    // Fetch from all exchanges in parallel
    const [binanceRes, lighterRes, hyperliquidRes, bybitRes] = await Promise.allSettled([
      fetch('https://fapi.binance.com/fapi/v1/premiumIndex', {
        next: { revalidate: 0 },
      }),
      fetch('https://mainnet.zklighter.elliot.ai/api/v1/funding-rates', {
        next: { revalidate: 0 },
      }),
      fetch('https://api.hyperliquid.xyz/info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'metaAndAssetCtxs' }),
      }),
      fetch('https://api.bybit.com/v5/market/tickers?category=linear', {
        next: { revalidate: 0 },
      }),
    ])

    // Process Binance data
    const binanceMap = new Map<string, NormalizedRate>()
    const binanceRecords: FundingRateDB[] = []

    if (binanceRes.status === 'fulfilled' && binanceRes.value.ok) {
      const binanceData: BinanceFundingRate[] = await binanceRes.value.json()
      binanceData
        .filter((item) => item.lastFundingRate !== undefined && item.lastFundingRate !== null)
        .forEach((item) => {
          const rate = parseFloat(item.lastFundingRate || '0')
          const symbol = item.symbol.replace('USDT', '').replace('1000', '')

          binanceRecords.push({
            symbol: item.symbol,
            exchange: 'binance',
            funding_rate: rate,
            funding_period_hours: 8,
            mark_price: parseFloat(item.markPrice),
            next_funding_time: item.nextFundingTime,
          })

          binanceMap.set(symbol, {
            symbol,
            rate,
            hourlyRate: rate / 8,
            markPrice: parseFloat(item.markPrice),
            nextFundingTime: item.nextFundingTime,
          })
        })
    } else {
      console.error('Failed to fetch Binance rates')
    }

    // Process Lighter data
    const lighterMap = new Map<string, NormalizedRate>()
    const lighterRecords: FundingRateDB[] = []

    if (lighterRes.status === 'fulfilled' && lighterRes.value.ok) {
      const lighterResult = await lighterRes.value.json()
      const lighterData: LighterFundingRate[] = lighterResult.funding_rates || []

      lighterData.forEach((item) => {
        lighterRecords.push({
          symbol: item.symbol,
          exchange: 'lighter',
          funding_rate: item.rate,
          funding_period_hours: 8,
        })

        lighterMap.set(item.symbol, {
          symbol: item.symbol,
          rate: item.rate,
          hourlyRate: item.rate / 8,
        })
      })
    } else {
      console.error('Failed to fetch Lighter rates')
    }

    // Process Hyperliquid data
    const hyperliquidMap = new Map<string, NormalizedRate>()
    const hyperliquidRecords: FundingRateDB[] = []

    if (hyperliquidRes.status === 'fulfilled' && hyperliquidRes.value.ok) {
      // Hyperliquid returns [meta, assetCtxs] array
      const hlData = await hyperliquidRes.value.json() as [
        { universe: Array<{ name: string }> },
        Array<{ funding: string; markPx?: string }>
      ]
      const universe = hlData[0]?.universe || []
      const assetCtxs = hlData[1] || []

      universe.forEach((asset, index) => {
        const ctx = assetCtxs[index]
        if (!ctx || !ctx.funding) return

        // Hyperliquid API returns HOURLY rate directly
        const hourlyRate = parseFloat(ctx.funding)
        const symbol = asset.name

        hyperliquidRecords.push({
          symbol,
          exchange: 'hyperliquid',
          funding_rate: hourlyRate,
          funding_period_hours: 1, // Rate is already hourly
          mark_price: ctx.markPx ? parseFloat(ctx.markPx) : undefined,
        })

        hyperliquidMap.set(symbol, {
          symbol,
          rate: hourlyRate,
          hourlyRate,
          markPrice: ctx.markPx ? parseFloat(ctx.markPx) : undefined,
        })
      })
    } else {
      console.error('Failed to fetch Hyperliquid rates')
    }

    // Process Bybit data
    const bybitMap = new Map<string, NormalizedRate>()
    const bybitRecords: FundingRateDB[] = []

    if (bybitRes.status === 'fulfilled' && bybitRes.value.ok) {
      const bybitData: BybitTickersResponse = await bybitRes.value.json()
      const tickers = bybitData.result?.list || []

      tickers
        .filter((t) => t.symbol.endsWith('USDT') && t.fundingRate)
        .forEach((ticker) => {
          const rate = parseFloat(ticker.fundingRate)
          const symbol = ticker.symbol.replace('USDT', '').replace('1000', '')
          // Use fundingIntervalHour from API (4 or 8), default to 8
          const fundingPeriodHours = ticker.fundingIntervalHour
            ? parseInt(ticker.fundingIntervalHour, 10)
            : 8
          const hourlyRate = rate / fundingPeriodHours

          bybitRecords.push({
            symbol: ticker.symbol,
            exchange: 'bybit',
            funding_rate: rate,
            funding_period_hours: fundingPeriodHours,
            mark_price: parseFloat(ticker.markPrice),
            next_funding_time: parseInt(ticker.nextFundingTime),
          })

          bybitMap.set(symbol, {
            symbol,
            rate,
            hourlyRate,
            markPrice: parseFloat(ticker.markPrice),
            nextFundingTime: parseInt(ticker.nextFundingTime),
          })
        })
    } else {
      console.error('Failed to fetch Bybit rates')
    }

    // Insert all funding rates
    const allRecords = [...binanceRecords, ...lighterRecords, ...hyperliquidRecords, ...bybitRecords]

    if (allRecords.length > 0) {
      const { error: insertError } = await supabase
        .from('funding_rates')
        .insert(allRecords)

      if (insertError) {
        console.error('Error inserting funding rates:', insertError)
      }
    }

    // Calculate and insert spreads for all symbols that exist on at least 2 exchanges
    const allSymbols = new Set<string>([
      ...lighterMap.keys(),
      ...hyperliquidMap.keys(),
      ...bybitMap.keys(),
    ])

    const spreadRecords: FundingSpreadDB[] = []

    allSymbols.forEach((symbol) => {
      const binance = binanceMap.get(symbol)
      const lighter = lighterMap.get(symbol)
      const hyperliquid = hyperliquidMap.get(symbol)
      const bybit = bybitMap.get(symbol)

      // Need at least Binance + one other exchange for meaningful spread
      if (!binance) return
      if (!lighter && !hyperliquid && !bybit) return

      // Calculate best spread (max hourly rate difference)
      const rates: { exchange: ExchangeId; hourlyRate: number }[] = []
      if (binance) rates.push({ exchange: 'binance', hourlyRate: binance.hourlyRate })
      if (lighter) rates.push({ exchange: 'lighter', hourlyRate: lighter.hourlyRate })
      if (hyperliquid) rates.push({ exchange: 'hyperliquid', hourlyRate: hyperliquid.hourlyRate })
      if (bybit) rates.push({ exchange: 'bybit', hourlyRate: bybit.hourlyRate })

      if (rates.length < 2) return

      // Find max spread
      let maxSpread = 0
      for (let i = 0; i < rates.length; i++) {
        for (let j = i + 1; j < rates.length; j++) {
          const spread = Math.abs(rates[i].hourlyRate - rates[j].hourlyRate) * 100
          if (spread > maxSpread) {
            maxSpread = spread
          }
        }
      }

      spreadRecords.push({
        symbol,
        binance_rate: binance?.rate || 0,
        lighter_rate: lighter?.rate || 0,
        hyperliquid_rate: hyperliquid?.rate,
        bybit_rate: bybit?.rate,
        spread_percent: maxSpread,
        binance_mark_price: binance?.markPrice,
      })
    })

    if (spreadRecords.length > 0) {
      const { error: spreadError } = await supabase
        .from('funding_spreads')
        .insert(spreadRecords)

      if (spreadError) {
        console.error('Error inserting spreads:', spreadError)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Funding rates updated successfully',
      stats: {
        binanceRecords: binanceRecords.length,
        lighterRecords: lighterRecords.length,
        hyperliquidRecords: hyperliquidRecords.length,
        bybitRecords: bybitRecords.length,
        spreadRecords: spreadRecords.length,
      },
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
  }
}
