import { NextResponse } from 'next/server'
import { fetchAllFundingRates, buildMultiExchangeSpreads } from '@/lib/exchanges'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Fetch from all exchanges in parallel
    const allRates = await fetchAllFundingRates()

    // Build multi-exchange spread data
    const spreads = buildMultiExchangeSpreads(allRates)

    // Calculate stats for each exchange
    const stats = {
      binance: allRates.get('binance')?.length || 0,
      lighter: allRates.get('lighter')?.length || 0,
      hyperliquid: allRates.get('hyperliquid')?.length || 0,
      bybit: allRates.get('bybit')?.length || 0,
      totalSymbols: spreads.length,
    }

    return NextResponse.json({
      success: true,
      data: spreads,
      stats,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error calculating multi-exchange funding spreads:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
