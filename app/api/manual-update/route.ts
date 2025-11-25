import { NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase'
import type {
  BinanceFundingRate,
  LighterFundingRate,
  BybitTickersResponse,
  FundingRateDB,
} from '@/lib/types'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

export async function GET() {
  const logs: string[] = []

  try {
    const supabase = getServiceSupabase()
    logs.push('Starting manual update...')

    // Fetch from all exchanges
    logs.push('Fetching from exchanges...')
    const [binanceRes, lighterRes, hyperliquidRes, bybitRes, fundingInfoRes] = await Promise.allSettled([
      fetch('https://fapi.binance.com/fapi/v1/premiumIndex'),
      fetch('https://mainnet.zklighter.elliot.ai/api/v1/funding-rates'),
      fetch('https://api.hyperliquid.xyz/info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'metaAndAssetCtxs' }),
      }),
      fetch('https://api.bybit.com/v5/market/tickers?category=linear'),
      fetch('https://fapi.binance.com/fapi/v1/fundingInfo'),
    ])

    // Build fundingInfo map
    const fundingIntervalMap = new Map<string, number>()
    if (fundingInfoRes.status === 'fulfilled' && fundingInfoRes.value.ok) {
      interface BinanceFundingInfo {
        symbol: string
        fundingIntervalHours: number
      }
      const fundingInfo: BinanceFundingInfo[] = await fundingInfoRes.value.json()
      fundingInfo.forEach((info) => {
        fundingIntervalMap.set(info.symbol, info.fundingIntervalHours)
      })
      logs.push(`Loaded ${fundingInfo.length} Binance fundingInfo entries`)
    }

    // Process Binance
    const binanceRecords: FundingRateDB[] = []
    if (binanceRes.status === 'fulfilled' && binanceRes.value.ok) {
      const binanceData: BinanceFundingRate[] = await binanceRes.value.json()
      binanceData
        .filter((item) => item.lastFundingRate !== undefined && item.lastFundingRate !== null)
        .filter((item) => fundingIntervalMap.has(item.symbol))
        .forEach((item) => {
          const rate = parseFloat(item.lastFundingRate || '0')
          const normalizedSymbol = item.symbol.replace('USDT', '').replace('USDC', '').replace('1000', '')
          const fundingPeriodHours = fundingIntervalMap.get(item.symbol) || 8

          binanceRecords.push({
            symbol: normalizedSymbol,
            exchange: 'binance',
            funding_rate: rate,
            funding_period_hours: fundingPeriodHours,
            mark_price: parseFloat(item.markPrice),
            next_funding_time: item.nextFundingTime,
          })
        })
      logs.push(`Processed ${binanceRecords.length} Binance records`)
    } else {
      logs.push('Failed to fetch Binance: ' + (binanceRes.status === 'rejected' ? binanceRes.reason : 'not ok'))
    }

    // Process Lighter
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
      })
      logs.push(`Processed ${lighterRecords.length} Lighter records`)
    } else {
      logs.push('Failed to fetch Lighter: ' + (lighterRes.status === 'rejected' ? lighterRes.reason : 'not ok'))
    }

    // Process Hyperliquid
    const hyperliquidRecords: FundingRateDB[] = []
    if (hyperliquidRes.status === 'fulfilled' && hyperliquidRes.value.ok) {
      const hlData = await hyperliquidRes.value.json() as [
        { universe: Array<{ name: string }> },
        Array<{ funding: string; markPx?: string }>
      ]
      const universe = hlData[0]?.universe || []
      const assetCtxs = hlData[1] || []

      universe.forEach((asset, index) => {
        const ctx = assetCtxs[index]
        if (!ctx || !ctx.funding) return

        const hourlyRate = parseFloat(ctx.funding)
        hyperliquidRecords.push({
          symbol: asset.name,
          exchange: 'hyperliquid',
          funding_rate: hourlyRate,
          funding_period_hours: 1,
          mark_price: ctx.markPx ? parseFloat(ctx.markPx) : undefined,
        })
      })
      logs.push(`Processed ${hyperliquidRecords.length} Hyperliquid records`)
    } else {
      logs.push('Failed to fetch Hyperliquid: ' + (hyperliquidRes.status === 'rejected' ? hyperliquidRes.reason : 'not ok'))
    }

    // Process Bybit
    const bybitRecords: FundingRateDB[] = []
    if (bybitRes.status === 'fulfilled' && bybitRes.value.ok) {
      const bybitData: BybitTickersResponse = await bybitRes.value.json()
      const tickers = bybitData.result?.list || []

      tickers
        .filter((t) => t.symbol.endsWith('USDT') && t.fundingRate)
        .forEach((ticker) => {
          const rate = parseFloat(ticker.fundingRate)
          const normalizedSymbol = ticker.symbol.replace('USDT', '').replace('USDC', '').replace('1000', '')
          const fundingPeriodHours = ticker.fundingIntervalHour
            ? parseInt(ticker.fundingIntervalHour, 10)
            : 8

          bybitRecords.push({
            symbol: normalizedSymbol,
            exchange: 'bybit',
            funding_rate: rate,
            funding_period_hours: fundingPeriodHours,
            mark_price: parseFloat(ticker.markPrice),
            next_funding_time: parseInt(ticker.nextFundingTime),
          })
        })
      logs.push(`Processed ${bybitRecords.length} Bybit records`)
    } else {
      logs.push('Failed to fetch Bybit: ' + (bybitRes.status === 'rejected' ? bybitRes.reason : 'not ok'))
    }

    // Insert all records
    const allFundingRates = [
      ...binanceRecords,
      ...lighterRecords,
      ...hyperliquidRecords,
      ...bybitRecords,
    ]

    logs.push(`Total records to insert: ${allFundingRates.length}`)

    if (allFundingRates.length > 0) {
      const { error: ratesError } = await supabase
        .from('funding_rates')
        .insert(allFundingRates)

      if (ratesError) {
        logs.push('ERROR inserting funding rates: ' + JSON.stringify(ratesError))
      } else {
        logs.push('✅ Successfully inserted all funding rates')
      }
    }

    return NextResponse.json({
      success: true,
      logs,
      stats: {
        binance: binanceRecords.length,
        lighter: lighterRecords.length,
        hyperliquid: hyperliquidRecords.length,
        bybit: bybitRecords.length,
        total: allFundingRates.length,
      },
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    logs.push('FATAL ERROR: ' + (error instanceof Error ? error.message : 'Unknown error'))
    return NextResponse.json(
      {
        success: false,
        logs,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
