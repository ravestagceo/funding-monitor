import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { PriceSpreadHistoryResponse, PriceSpreadPoint, PriceSpreadStatistics, ExchangeId } from '@/lib/types'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(
  request: Request,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    const { searchParams } = new URL(request.url)
    const hours = parseInt(searchParams.get('hours') || '6')
    const exchange1 = (searchParams.get('exchange1') || 'binance') as ExchangeId
    const exchange2 = (searchParams.get('exchange2') || 'hyperliquid') as ExchangeId

    const { symbol } = await params

    // Calculate time range
    const now = new Date()
    const startTime = new Date(now.getTime() - hours * 60 * 60 * 1000)

    // Fetch data from both exchanges
    const { data: exchange1Data, error: error1 } = await supabase
      .from('funding_rates')
      .select('created_at, mark_price')
      .eq('symbol', symbol)
      .eq('exchange', exchange1)
      .gte('created_at', startTime.toISOString())
      .order('created_at', { ascending: true })

    const { data: exchange2Data, error: error2 } = await supabase
      .from('funding_rates')
      .select('created_at, mark_price')
      .eq('symbol', symbol)
      .eq('exchange', exchange2)
      .gte('created_at', startTime.toISOString())
      .order('created_at', { ascending: true })

    if (error1 || error2) {
      throw new Error(`Database error: ${error1?.message || error2?.message}`)
    }

    if (!exchange1Data || !exchange2Data || exchange1Data.length === 0 || exchange2Data.length === 0) {
      return NextResponse.json({
        success: true,
        symbol,
        exchange1,
        exchange2,
        period: `${hours}h`,
        history: [],
        statistics: null,
        timestamp: new Date().toISOString(),
      })
    }

    // Match data points by timestamp (within 1 minute tolerance)
    const history: PriceSpreadPoint[] = []
    const tolerance = 60 * 1000 // 1 minute in milliseconds

    exchange1Data.forEach((point1: any) => {
      const timestamp1 = new Date(point1.created_at).getTime()

      // Find closest matching point from exchange2
      const matchingPoint = exchange2Data.find((point2: any) => {
        const timestamp2 = new Date(point2.created_at).getTime()
        return Math.abs(timestamp1 - timestamp2) < tolerance
      })

      if (matchingPoint && point1.mark_price && matchingPoint.mark_price) {
        const price1 = parseFloat(point1.mark_price)
        const price2 = parseFloat(matchingPoint.mark_price)
        const spreadAbsolute = price1 - price2
        const spreadPercent = (spreadAbsolute / price2) * 100

        history.push({
          timestamp: point1.created_at,
          exchange1_price: price1,
          exchange2_price: price2,
          spread_absolute: spreadAbsolute,
          spread_percent: spreadPercent,
        })
      }
    })

    // Calculate statistics
    let statistics: PriceSpreadStatistics | null = null
    if (history.length > 0) {
      const spreadsAbsolute = history.map(h => h.spread_absolute)
      const spreadsPercent = history.map(h => h.spread_percent)

      const avgSpreadAbsolute = spreadsAbsolute.reduce((a, b) => a + b, 0) / spreadsAbsolute.length
      const avgSpreadPercent = spreadsPercent.reduce((a, b) => a + b, 0) / spreadsPercent.length

      // Calculate volatility (standard deviation of percent spread)
      const variance = spreadsPercent
        .reduce((sum, val) => sum + Math.pow(val - avgSpreadPercent, 2), 0) / spreadsPercent.length
      const volatility = Math.sqrt(variance)

      statistics = {
        avgSpreadAbsolute,
        avgSpreadPercent,
        minSpreadAbsolute: Math.min(...spreadsAbsolute),
        maxSpreadAbsolute: Math.max(...spreadsAbsolute),
        minSpreadPercent: Math.min(...spreadsPercent),
        maxSpreadPercent: Math.max(...spreadsPercent),
        volatility,
        totalPoints: history.length,
      }
    }

    const response: PriceSpreadHistoryResponse = {
      success: true,
      symbol,
      exchange1,
      exchange2,
      period: `${hours}h`,
      history,
      statistics,
      timestamp: new Date().toISOString(),
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching price spread history:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
