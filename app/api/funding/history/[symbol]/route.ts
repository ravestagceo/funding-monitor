import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'
import type { ExchangeId } from '@/lib/types'
import { EXCHANGE_CONFIG } from '@/lib/types'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

interface SpreadHistoryPoint {
  timestamp: string
  spread_percent: number
  exchange1_rate: number
  exchange2_rate: number
}

interface SpreadStatistics {
  avgSpread: number
  medianSpread: number
  minSpread: number
  maxSpread: number
  volatility: number
  stabilityScore: number // % of time spread was > 0.01%
  profitableMinutes: number
  totalMinutes: number
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    const { symbol } = await params
    const searchParams = request.nextUrl.searchParams
    const hours = parseInt(searchParams.get('hours') || '6', 10)
    const exchange1 = (searchParams.get('exchange1') || 'binance') as ExchangeId
    const exchange2 = (searchParams.get('exchange2') || 'lighter') as ExchangeId

    const supabase = getSupabase()

    // Calculate timestamp for N hours ago
    const hoursAgo = new Date()
    hoursAgo.setHours(hoursAgo.getHours() - hours)

    // Get column names for the exchanges
    const ex1Column = `${exchange1}_rate` as const
    const ex2Column = `${exchange2}_rate` as const

    // Fetch historical spread data with dynamic exchange columns
    const { data: spreadData, error: spreadError } = await supabase
      .from('funding_spreads')
      .select(`created_at, ${ex1Column}, ${ex2Column}`)
      .eq('symbol', symbol)
      .gte('created_at', hoursAgo.toISOString())
      .order('created_at', { ascending: true })

    if (spreadError) {
      throw spreadError
    }

    if (!spreadData || spreadData.length === 0) {
      return NextResponse.json({
        success: true,
        symbol,
        exchange1,
        exchange2,
        history: [],
        statistics: null,
        message: 'No historical data available for this symbol',
      })
    }

    // Filter out rows where either exchange has no data
    const validData = spreadData.filter(
      (row) => (row as any)[ex1Column] != null && (row as any)[ex2Column] != null
    )

    if (validData.length === 0) {
      return NextResponse.json({
        success: true,
        symbol,
        exchange1,
        exchange2,
        history: [],
        statistics: null,
        message: `No data available for ${exchange1} and ${exchange2} combination`,
      })
    }

    // Transform data - rates in DB are already hourly, just need to convert to percent
    // Spread = Exchange1 - Exchange2 (preserving sign for profit/loss interpretation)
    // Positive spread = Exchange1 > Exchange2 (profitable for Long Ex1 + Short Ex2)
    // Negative spread = Exchange1 < Exchange2 (unprofitable for Long Ex1 + Short Ex2)
    const history: SpreadHistoryPoint[] = validData.map((row) => {
      const ex1Rate = (row as any)[ex1Column] as number  // Already hourly
      const ex2Rate = (row as any)[ex2Column] as number  // Already hourly
      const spreadPercent = (ex1Rate - ex2Rate) * 100  // Keep the sign!

      return {
        timestamp: (row as any).created_at,
        spread_percent: spreadPercent,
        exchange1_rate: ex1Rate,
        exchange2_rate: ex2Rate,
      }
    })

    // Calculate statistics
    const spreads = history.map((h) => h.spread_percent)
    const avgSpread = spreads.reduce((a, b) => a + b, 0) / spreads.length

    // Calculate median
    const sortedSpreads = [...spreads].sort((a, b) => a - b)
    const mid = Math.floor(sortedSpreads.length / 2)
    const medianSpread =
      sortedSpreads.length % 2 === 0
        ? (sortedSpreads[mid - 1] + sortedSpreads[mid]) / 2
        : sortedSpreads[mid]

    const minSpread = Math.min(...spreads)
    const maxSpread = Math.max(...spreads)

    // Calculate volatility (standard deviation)
    const variance =
      spreads.reduce((sum, val) => sum + Math.pow(val - avgSpread, 2), 0) /
      spreads.length
    const volatility = Math.sqrt(variance)

    // Calculate stability score (% of time spread was profitable > 0.01%)
    // Profitable = positive spread (Exchange1 > Exchange2)
    const profitableThreshold = 0.01
    const profitableMinutes = spreads.filter(
      (s) => s > profitableThreshold
    ).length
    const stabilityScore = (profitableMinutes / spreads.length) * 100

    const statistics: SpreadStatistics = {
      avgSpread: parseFloat(avgSpread.toFixed(4)),
      medianSpread: parseFloat(medianSpread.toFixed(4)),
      minSpread: parseFloat(minSpread.toFixed(4)),
      maxSpread: parseFloat(maxSpread.toFixed(4)),
      volatility: parseFloat(volatility.toFixed(4)),
      stabilityScore: parseFloat(stabilityScore.toFixed(2)),
      profitableMinutes,
      totalMinutes: spreads.length,
    }

    return NextResponse.json({
      success: true,
      symbol,
      exchange1,
      exchange2,
      period: `${hours}h`,
      history,
      statistics,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error fetching spread history:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
