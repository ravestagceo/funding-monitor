import { NextResponse } from 'next/server'
import type { BinanceFundingRate } from '@/lib/types'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const response = await fetch('https://fapi.binance.com/fapi/v1/premiumIndex', {
      next: { revalidate: 0 },
    })

    if (!response.ok) {
      throw new Error(`Binance API error: ${response.status}`)
    }

    const data: BinanceFundingRate[] = await response.json()

    // Filter only perpetual futures with funding rates
    const filteredData = data.filter(
      (item) => item.lastFundingRate !== undefined && item.lastFundingRate !== null
    )

    return NextResponse.json({
      success: true,
      data: filteredData,
      count: filteredData.length,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error fetching Binance funding rates:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
