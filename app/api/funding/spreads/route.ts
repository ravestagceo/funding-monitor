import { NextResponse } from 'next/server'
import type { BinanceFundingRate, LighterFundingRate, FundingSpread } from '@/lib/types'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

interface SpreadMap {
  [symbol: string]: FundingSpread
}

export async function GET() {
  try {
    // Fetch from both exchanges in parallel
    const [binanceRes, lighterRes] = await Promise.all([
      fetch('https://fapi.binance.com/fapi/v1/premiumIndex', {
        next: { revalidate: 0 },
      }),
      fetch('https://mainnet.zklighter.elliot.ai/api/v1/funding-rates', {
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

    // Create maps for quick lookup
    const binanceMap = new Map<string, BinanceFundingRate>()
    binanceData.forEach((item) => {
      if (item.lastFundingRate !== undefined && item.lastFundingRate !== null) {
        binanceMap.set(item.symbol, item)
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

        // Calculate actual funding period from last funding time to next funding time
        // lastFundingRate is the rate that was applied at fundingTime
        // nextFundingTime - fundingTime = funding period (4h or 8h)
        const lastFundingTime = binanceItem.fundingTime || now
        const nextFunding = binanceItem.nextFundingTime || now
        const fundingPeriodMs = nextFunding - lastFundingTime
        const fundingPeriodHours = fundingPeriodMs / (1000 * 60 * 60)

        // Round to nearest common period (4 or 8 hours) to handle small variations
        const binancePeriod = fundingPeriodHours <= 6 ? 4 : 8

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
