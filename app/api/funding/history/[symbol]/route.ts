import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

interface SpreadHistoryPoint {
  timestamp: string
  spread_percent: number
  binance_rate: number
  lighter_rate: number
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
  { params }: { params: { symbol: string } }
) {
  try {
    const { symbol } = params
    const searchParams = request.nextUrl.searchParams
    const hours = parseInt(searchParams.get('hours') || '6', 10)

    const supabase = getSupabase()

    // Calculate timestamp for N hours ago
    const hoursAgo = new Date()
    hoursAgo.setHours(hoursAgo.getHours() - hours)

    // Fetch historical data
    const { data, error } = await supabase
      .from('funding_spreads')
      .select('created_at, spread_percent, binance_rate, lighter_rate')
      .eq('symbol', symbol)
      .gte('created_at', hoursAgo.toISOString())
      .order('created_at', { ascending: true })

    if (error) {
      throw error
    }

    if (!data || data.length === 0) {
      return NextResponse.json({
        success: true,
        symbol,
        history: [],
        statistics: null,
        message: 'No historical data available for this symbol',
      })
    }

    // Transform data
    const history: SpreadHistoryPoint[] = data.map((row) => ({
      timestamp: row.created_at,
      spread_percent: row.spread_percent,
      binance_rate: row.binance_rate,
      lighter_rate: row.lighter_rate,
    }))

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
    const profitableThreshold = 0.01
    const profitableMinutes = spreads.filter(
      (s) => Math.abs(s) > profitableThreshold
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
