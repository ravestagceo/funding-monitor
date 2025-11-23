import { NextResponse } from 'next/server'
import type { BinanceFundingRate, LighterFundingRate, FundingSpread } from '@/lib/types'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

interface SpreadMap {
  [symbol: string]: FundingSpread
}

interface BinanceFundingInfo {
  symbol: string
  fundingIntervalHours: number
}

export async function GET() {
  try {
    // Fetch from all endpoints in parallel
    const [binanceRes, lighterRes, fundingInfoRes] = await Promise.all([
      fetch('https://fapi.binance.com/fapi/v1/premiumIndex', {
        next: { revalidate: 0 },
      }),
      fetch('https://mainnet.zklighter.elliot.ai/api/v1/funding-rates', {
        next: { revalidate: 0 },
      }),
      fetch('https://fapi.binance.com/fapi/v1/fundingInfo', {
        next: { revalidate: 0 },
      }),
    ])

    if (!binanceRes.ok) {
      throw new Error(`Binance API error: ${binanceRes.status}`)
    }

    if (!lighterRes.ok) {
      throw new Error(`Lighter API error: ${lighterRes.status}`)
    }

    const binanceData: BinanceFundingRate[] = await binanceRes.json()
    const lighterResult = await lighterRes.json()
    const lighterData: LighterFundingRate[] = lighterResult.funding_rates || []

    // Build map of symbol -> fundingIntervalHours
    const fundingIntervalMap = new Map<string, number>()
    if (fundingInfoRes.ok) {
      const fundingInfo: BinanceFundingInfo[] = await fundingInfoRes.json()
      fundingInfo.forEach((info) => {
        fundingIntervalMap.set(info.symbol, info.fundingIntervalHours)
      })
    }

    // Create maps for quick lookup
    const binanceMap = new Map<string, BinanceFundingRate>()
    binanceData.forEach((item) => {
      if (item.lastFundingRate !== undefined && item.lastFundingRate !== null) {
        // Only include symbols that exist in fundingInfo
        if (fundingIntervalMap.has(item.symbol)) {
          binanceMap.set(item.symbol, item)
        }
      }
    })

    const lighterMap = new Map<string, LighterFundingRate>()
    lighterData.forEach((item) => {
      lighterMap.set(item.symbol, item)
    })

    // Calculate spreads for matching symbols
    const spreads: SpreadMap = {}
    const now = Date.now()

    lighterData.forEach((lighterItem) => {
      const symbol = lighterItem.symbol

      // Try to find matching Binance symbol
      // Lighter uses different naming: BTC, ETH vs BTCUSDT, ETHUSDT
      let binanceSymbol = `${symbol}USDT`

      // Handle special cases
      if (symbol.startsWith('1000')) {
        binanceSymbol = symbol + 'USDT'
      }

      const binanceItem = binanceMap.get(binanceSymbol)

      if (binanceItem) {
        const binanceRate = parseFloat(binanceItem.lastFundingRate || '0')
        const lighterRate = lighterItem.rate

        // Get actual funding period from fundingInfo
        const binancePeriod = fundingIntervalMap.get(binanceSymbol) || 8

        // Normalize to hourly rates
        const binanceHourlyRate = binanceRate / binancePeriod
        const lighterHourlyRate = lighterRate / 8 // Lighter rate is for 8 hours

        // Calculate spreads
        const spreadHourly = (binanceHourlyRate - lighterHourlyRate) * 100
        const spreadDaily = spreadHourly * 24
        const spreadAnnual = spreadHourly * 24 * 365

        spreads[symbol] = {
          symbol,
          binanceRate,
          binanceHourlyRate,
          binanceNextFunding: binanceItem.nextFundingTime,
          lighterRate,
          lighterHourlyRate,
          lighterNextFunding: Math.ceil(now / (1000 * 60 * 60)) * (1000 * 60 * 60), // Next hour
          spreadHourly,
          spreadDaily,
          spreadAnnual,
          binanceMarkPrice: parseFloat(binanceItem.markPrice),
          updatedAt: new Date().toISOString(),
        }
      }
    })

    // Convert to array and sort by absolute spread
    const spreadsArray = Object.values(spreads).sort(
      (a, b) => Math.abs(b.spreadHourly) - Math.abs(a.spreadHourly)
    )

    return NextResponse.json({
      success: true,
      data: spreadsArray,
      count: spreadsArray.length,
      timestamp: new Date().toISOString(),
      stats: {
        totalBinanceSymbols: binanceMap.size,
        totalLighterSymbols: lighterMap.size,
        matchedSymbols: spreadsArray.length,
      },
    })
  } catch (error) {
    console.error('Error calculating funding spreads:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
