import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    // Get counts per exchange (more efficient than fetching all)
    const exchanges = ['binance', 'lighter', 'hyperliquid', 'bybit']
    const byExchange: Record<string, number> = {}
    const sampleData: Record<string, any[]> = {}

    for (const exchange of exchanges) {
      // Count
      const { count } = await supabase
        .from('funding_rates')
        .select('*', { count: 'exact', head: true })
        .eq('exchange', exchange)

      byExchange[exchange] = count || 0

      // Get samples
      const { data: samples } = await supabase
        .from('funding_rates')
        .select('symbol, created_at, mark_price')
        .eq('exchange', exchange)
        .order('created_at', { ascending: false })
        .limit(3)

      sampleData[exchange] = samples?.map(s => ({
        symbol: s.symbol,
        created_at: s.created_at,
        has_mark_price: !!s.mark_price,
        mark_price: s.mark_price
      })) || []
    }

    // Get oldest and newest records
    const { data: oldest } = await supabase
      .from('funding_rates')
      .select('created_at, exchange')
      .order('created_at', { ascending: true })
      .limit(1)

    const { data: newest } = await supabase
      .from('funding_rates')
      .select('created_at, exchange')
      .order('created_at', { ascending: false })
      .limit(1)

    const totalRecords = Object.values(byExchange).reduce((sum, count) => sum + count, 0)

    return NextResponse.json({
      success: true,
      stats: {
        totalRecords,
        byExchange,
        oldestRecord: oldest?.[0],
        newestRecord: newest?.[0],
      },
      samples: sampleData,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Debug error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
