import { NextResponse } from 'next/server'
import type { LighterFundingRate } from '@/lib/types'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const response = await fetch(
      'https://mainnet.zklighter.elliot.ai/api/v1/funding-rates',
      {
        next: { revalidate: 0 },
      }
    )

    if (!response.ok) {
      throw new Error(`Lighter API error: ${response.status}`)
    }

    const result = await response.json()

    return NextResponse.json({
      success: true,
      data: result.funding_rates || [],
      count: result.funding_rates?.length || 0,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error fetching Lighter funding rates:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
