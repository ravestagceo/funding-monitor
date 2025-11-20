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
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    const { symbol } = await params
    const searchParams = request.nextUrl.searchParams
    const hours = parseInt(searchParams.get('hours') || '6', 10)

    const supabase = getSupabase()

    // Calculate timestamp for N hours ago
    const hoursAgo = new Date()
    hoursAgo.setHours(hoursAgo.getHours() - hours)

    // Fetch historical spread data
    const { data: spreadData, error: spreadError } = await supabase
      .from('funding_spreads')
      .select('created_at, spread_percent, binance_rate, lighter_rate')
      .eq('symbol', symbol)
      .gte('created_at', hoursAgo.toISOString())
      .order('created_at', { ascending: true })

    // Fetch Binance funding data to get next_funding_time for period calculation
    const binanceSymbol = symbol.includes('USDT') ? symbol : `${symbol}USDT`
    const { data: binanceData, error: binanceError } = await supabase
      .from('funding_rates')
      .select('created_at, next_funding_time')
      .eq('symbol', binanceSymbol)
      .eq('exchange', 'binance')
      .gte('created_at', hoursAgo.toISOString())
      .order('created_at', { ascending: true })

    if (spreadError) {
      throw spreadError
    }

    if (!spreadData || spreadData.length === 0) {
      return NextResponse.json({
        success: true,
        symbol,
        history: [],
        statistics: null,
        message: 'No historical data available for this symbol',
      })
    }

    // Create a map of timestamps to funding periods
    const periodMap = new Map<string, number>()

    if (binanceData && binanceData.length > 0) {
      binanceData.forEach((row) => {
        if (row.next_funding_time) {
          const createdTime = new Date(row.created_at).getTime()
          const nextFundingTime = row.next_funding_time
          const periodHours = (nextFundingTime - createdTime) / (1000 * 60 * 60)

          // Round to nearest hour to handle small variations (should be 4 or 8)
          const roundedPeriod = Math.round(periodHours)
          periodMap.set(row.created_at, roundedPeriod)
        }
      })
    }

    // Helper function to find closest period for a timestamp
    const getPeriodForTimestamp = (timestamp: string): number => {
      // Try exact match first
      if (periodMap.has(timestamp)) {
        return periodMap.get(timestamp)!
      }

      // If no exact match, find closest timestamp within 1 minute
      const targetTime = new Date(timestamp).getTime()
      let closestPeriod = 8 // Default to 8h if not found
      let minDiff = Infinity

      periodMap.forEach((period, ts) => {
        const diff = Math.abs(new Date(ts).getTime() - targetTime)
        if (diff < minDiff && diff < 60000) { // Within 1 minute
          minDiff = diff
          closestPeriod = period
        }
      })

      return closestPeriod
    }

    // Transform data and normalize rates to hourly using actual periods
    const history: SpreadHistoryPoint[] = spreadData.map((row) => {
      const binancePeriod = getPeriodForTimestamp(row.created_at)

      return {
        timestamp: row.created_at,
        spread_percent: row.spread_percent,
        binance_rate: row.binance_rate / binancePeriod, // Normalize using actual period
        lighter_rate: row.lighter_rate / 8, // Lighter is always 8h
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
