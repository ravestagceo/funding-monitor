import { NextRequest, NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase'
import type {
  BinanceFundingRate,
  LighterFundingRate,
  FundingRateDB,
  FundingSpreadDB,
} from '@/lib/types'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = getServiceSupabase()

    // Fetch from both exchanges in parallel
    const [binanceRes, lighterRes] = await Promise.all([
      fetch('https://fapi.binance.com/fapi/v1/premiumIndex', {
        next: { revalidate: 0 },
      }),
      fetch('https://mainnet.zklighter.elliot.ai/api/v1/funding-rates', {
        next: { revalidate: 0 },
      }),
    ])

    if (!binanceRes.ok || !lighterRes.ok) {
      throw new Error('Failed to fetch from one or both exchanges')
    }

    const binanceData: BinanceFundingRate[] = await binanceRes.json()
    const lighterResult = await lighterRes.json()
    const lighterData: LighterFundingRate[] = lighterResult.funding_rates || []

    // Prepare Binance data for insertion
    const binanceRecords: FundingRateDB[] = binanceData
      .filter((item) => item.lastFundingRate !== undefined && item.lastFundingRate !== null)
      .map((item) => ({
        symbol: item.symbol,
        exchange: 'binance' as const,
        funding_rate: parseFloat(item.lastFundingRate || '0'),
        mark_price: parseFloat(item.markPrice),
        next_funding_time: item.nextFundingTime,
      }))

    // Prepare Lighter data for insertion
    const lighterRecords: FundingRateDB[] = lighterData.map((item) => ({
      symbol: item.symbol,
      exchange: 'lighter' as const,
      funding_rate: item.rate,
    }))

    // Insert funding rates
    const { error: binanceError } = await supabase
      .from('funding_rates')
      .insert(binanceRecords)

    const { error: lighterError } = await supabase
      .from('funding_rates')
      .insert(lighterRecords)

    if (binanceError || lighterError) {
      console.error('Error inserting funding rates:', { binanceError, lighterError })
    }

    // Calculate and insert spreads
    const binanceMap = new Map<string, BinanceFundingRate>()
    binanceData.forEach((item) => {
      if (item.lastFundingRate !== undefined && item.lastFundingRate !== null) {
        binanceMap.set(item.symbol, item)
      }
    })

    const spreadRecords: FundingSpreadDB[] = []

    lighterData.forEach((lighterItem) => {
      const symbol = lighterItem.symbol
      let binanceSymbol = `${symbol}USDT`

      if (symbol.startsWith('1000')) {
        binanceSymbol = symbol + 'USDT'
      }

      const binanceItem = binanceMap.get(binanceSymbol)

      if (binanceItem) {
        const binanceRate = parseFloat(binanceItem.lastFundingRate || '0')
        const lighterRate = lighterItem.rate
        const spreadPercent = (binanceRate - lighterRate) * 100

        spreadRecords.push({
          symbol,
          binance_rate: binanceRate,
          lighter_rate: lighterRate,
          spread_percent: spreadPercent,
          binance_mark_price: parseFloat(binanceItem.markPrice),
        })
      }
    })

    const { error: spreadError } = await supabase
      .from('funding_spreads')
      .insert(spreadRecords)

    if (spreadError) {
      console.error('Error inserting spreads:', spreadError)
    }

    return NextResponse.json({
      success: true,
      message: 'Funding rates updated successfully',
      stats: {
        binanceRecords: binanceRecords.length,
        lighterRecords: lighterRecords.length,
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
