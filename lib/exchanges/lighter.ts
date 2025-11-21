import type { LighterFundingRate, NormalizedFundingRate } from '@/lib/types'

const LIGHTER_API_URL = 'https://mainnet.zklighter.elliot.ai/api/v1/funding-rates'

/**
 * Fetch current funding rates from Lighter DEX
 *
 * Lighter funding:
 * - 8-hour funding period
 * - Rate is for the 8-hour period
 */
export async function fetchLighterFundingRates(): Promise<NormalizedFundingRate[]> {
  try {
    const response = await fetch(LIGHTER_API_URL, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Lighter API error: ${response.status}`)
    }

    const result = await response.json()
    const data: LighterFundingRate[] = result.funding_rates || []

    const now = Date.now()
    const rates: NormalizedFundingRate[] = []

    data.forEach((item) => {
      const fundingRate = item.rate
      const fundingPeriodHours = 8
      const hourlyRate = fundingRate / fundingPeriodHours

      rates.push({
        exchange: 'lighter',
        symbol: item.symbol, // Lighter uses clean symbols like BTC, ETH
        originalSymbol: item.symbol,
        fundingRate,
        fundingPeriodHours,
        hourlyRate,
        markPrice: undefined, // Lighter doesn't provide mark price in funding endpoint
        nextFundingTime: getNextLighterFundingTime(),
        timestamp: now,
      })
    })

    return rates
  } catch (error) {
    console.error('Error fetching Lighter funding rates:', error)
    throw error
  }
}

/**
 * Get next 8-hour funding time for Lighter
 * Assuming standard 00:00, 08:00, 16:00 UTC schedule
 */
function getNextLighterFundingTime(): number {
  const now = new Date()
  const utcHour = now.getUTCHours()

  let nextHour: number
  if (utcHour < 8) {
    nextHour = 8
  } else if (utcHour < 16) {
    nextHour = 16
  } else {
    nextHour = 24 // Next day 00:00
  }

  const next = new Date(now)
  next.setUTCHours(nextHour % 24, 0, 0, 0)
  if (nextHour === 24) {
    next.setUTCDate(next.getUTCDate() + 1)
  }

  return next.getTime()
}

/**
 * Get exchange URL for a symbol
 */
export function getLighterUrl(symbol: string): string {
  return `https://app.lighter.xyz/trade/${symbol}`
}
