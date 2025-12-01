import type { AsterPremiumIndex, NormalizedFundingRate } from '@/lib/types'

const ASTER_API_URL = 'https://fapi.asterdex.com'

// Cache funding intervals to avoid repeated API calls
const fundingIntervalCache = new Map<string, { interval: number; timestamp: number }>()
const CACHE_TTL = 24 * 60 * 60 * 1000 // 24 hours

/**
 * Fetch current funding rates from Aster DEX
 *
 * Aster funding:
 * - Variable funding periods (1h, 4h, or 8h depending on symbol)
 * - API returns lastFundingRate for the funding period (NOT hourly)
 * - We fetch funding history to determine actual interval per symbol
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

    // Filter valid symbols first
    const validItems = data.filter(
      (item) => item.lastFundingRate && item.symbol.endsWith('USDT')
    )

    // Fetch all funding intervals in parallel
    const intervalPromises = validItems.map((item) => getFundingInterval(item.symbol))
    const intervals = await Promise.all(intervalPromises)

    // Build normalized rates
    const rates: NormalizedFundingRate[] = []
    validItems.forEach((item, index) => {
      const fundingRate = parseFloat(item.lastFundingRate!)
      const markPrice = item.markPrice ? parseFloat(item.markPrice) : undefined
      const nextFundingTime = item.nextFundingTime || undefined
      const fundingPeriodHours = intervals[index]
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
 * Get funding interval for a symbol by checking historical funding times
 * Returns 1, 4, or 8 hours, with caching to minimize API calls
 */
async function getFundingInterval(symbol: string): Promise<number> {
  const now = Date.now()

  // Check cache first
  const cached = fundingIntervalCache.get(symbol)
  if (cached && now - cached.timestamp < CACHE_TTL) {
    return cached.interval
  }

  try {
    const response = await fetch(
      `${ASTER_API_URL}/fapi/v1/fundingRate?symbol=${symbol}&limit=2`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )

    if (!response.ok) {
      // Default to 8 hours if we can't fetch history
      return 8
    }

    const history: Array<{ fundingTime: number }> = await response.json()

    if (history.length >= 2) {
      const intervalMs = history[1].fundingTime - history[0].fundingTime
      const intervalHours = intervalMs / 1000 / 3600

      // Determine interval: 1h, 4h, or 8h
      let interval: number
      if (intervalHours < 2) {
        interval = 1
      } else if (intervalHours < 6) {
        interval = 4
      } else {
        interval = 8
      }

      // Cache the result
      fundingIntervalCache.set(symbol, { interval, timestamp: now })

      return interval
    }

    // Default to 8 hours
    return 8
  } catch (error) {
    console.warn(`Failed to get funding interval for ${symbol}:`, error)
    return 8
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
  return `https://www.asterdex.com/en/trade/pro/futures/${asterSymbol}`
}
