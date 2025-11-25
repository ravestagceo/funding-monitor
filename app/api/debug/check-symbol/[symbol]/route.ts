import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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
    const { symbol } = await params

    const exchanges = ['binance', 'lighter', 'hyperliquid', 'bybit']
    const results: Record<string, any> = {}

    for (const exchange of exchanges) {
      const { data, count } = await supabase
        .from('funding_rates')
        .select('symbol, created_at, mark_price', { count: 'exact' })
        .eq('exchange', exchange)
        .ilike('symbol', `%${symbol}%`)
        .order('created_at', { ascending: false })
        .limit(5)

      results[exchange] = {
        count: count || 0,
        samples: data || []
      }
    }

    return NextResponse.json({
      success: true,
      symbol,
      results,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
