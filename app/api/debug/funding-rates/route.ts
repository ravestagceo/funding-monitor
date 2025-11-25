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
    // Get count of records per exchange
    const { data: allData, error } = await supabase
      .from('funding_rates')
      .select('exchange, symbol, created_at, mark_price')
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) {
      throw error
    }

    // Group by exchange
    const byExchange: Record<string, number> = {}
    const sampleData: Record<string, any[]> = {}

    allData?.forEach(record => {
      byExchange[record.exchange] = (byExchange[record.exchange] || 0) + 1
      if (!sampleData[record.exchange]) {
        sampleData[record.exchange] = []
      }
      if (sampleData[record.exchange].length < 3) {
        sampleData[record.exchange].push({
          symbol: record.symbol,
          created_at: record.created_at,
          has_mark_price: !!record.mark_price,
          mark_price: record.mark_price
        })
      }
    })

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

    return NextResponse.json({
      success: true,
      stats: {
        totalRecords: allData?.length || 0,
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
