import type { AsterPremiumIndex, NormalizedFundingRate } from '@/lib/types'

const ASTER_API_URL = 'https://fapi.asterdex.com'

/**
 * Fetch current funding rates from Aster DEX
 *
 * Aster funding:
 * - 8-hour funding periods (standard)
 * - Fixed interest rate: 0.03% per day = 0.00125% per hour
 * - API returns lastFundingRate for each symbol
 * - Symbol format: BTCUSDT (no separator)
 */
export async function fetchAsterFundingRates(): Promise<NormalizedFundingRate[]> {
  try {
    // Fetch all premium index data (includes funding rates)
    const response = await fetch(`${ASTER_API_URL}/fapi/v1/premiumIndex`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Aster API error: ${response.status}`)
    }

    const data: AsterPremiumIndex[] = await response.json()

    const now = Date.now()
    const rates: NormalizedFundingRate[] = []

    data.forEach((item) => {
      // Skip if no funding rate or not USDT pair
      if (!item.lastFundingRate || !item.symbol.endsWith('USDT')) {
        return
      }

      const fundingRate = parseFloat(item.lastFundingRate)
      const markPrice = item.markPrice ? parseFloat(item.markPrice) : undefined
      const nextFundingTime = item.nextFundingTime || undefined

      // Aster uses 8-hour funding period
      const fundingPeriodHours = 8
      const hourlyRate = fundingRate / fundingPeriodHours

      const normalizedSymbol = normalizeSymbol(item.symbol)
      if (!normalizedSymbol) return

      rates.push({
        exchange: 'aster',
        symbol: normalizedSymbol,
        originalSymbol: item.symbol,
        fundingRate,
        fundingPeriodHours,
        hourlyRate,
        markPrice,
        nextFundingTime,
        timestamp: now,
      })
    })

    return rates
  } catch (error) {
    console.error('Error fetching Aster funding rates:', error)
    throw error
  }
}

/**
 * Normalize symbol to common format
 * Aster uses: BTCUSDT, ETHUSDT, etc. (no separator)
 */
function normalizeSymbol(symbol: string): string | null {
  // Remove USDT suffix
  if (symbol.endsWith('USDT')) {
    return symbol.replace('USDT', '')
  }

  // Skip USDC and other pairs for now
  return null
}

/**
 * Get exchange URL for a symbol
 */
export function getAsterUrl(symbol: string): string {
  // Aster uses format like BTCUSDT
  const asterSymbol = symbol.includes('USDT') ? symbol : `${symbol}USDT`
  return `https://app.asterdex.com/trade/${asterSymbol}`
}
