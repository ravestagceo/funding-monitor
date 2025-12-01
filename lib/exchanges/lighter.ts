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

    // Fetch mark prices from Binance for all symbols
    const symbols = data.map((item) => `${item.symbol}USDT`)
    const priceMap = await fetchBinancePrices(symbols)

    const now = Date.now()
    const rates: NormalizedFundingRate[] = []

    data.forEach((item) => {
      const fundingRate = item.rate
      const fundingPeriodHours = 8
      const hourlyRate = fundingRate / fundingPeriodHours
      const markPrice = priceMap.get(item.symbol)

      rates.push({
        exchange: 'lighter',
        symbol: item.symbol, // Lighter uses clean symbols like BTC, ETH
        originalSymbol: item.symbol,
        fundingRate,
        fundingPeriodHours,
        hourlyRate,
        markPrice,
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
 * Fetch mark prices from Binance for given symbols
 */
async function fetchBinancePrices(symbols: string[]): Promise<Map<string, number>> {
  const priceMap = new Map<string, number>()

  try {
    // Binance allows fetching multiple prices at once
    const response = await fetch('https://fapi.binance.com/fapi/v1/ticker/price', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      console.warn('Failed to fetch Binance prices for Lighter')
      return priceMap
    }

    const data: Array<{ symbol: string; price: string }> = await response.json()

    // Build map of symbol (without USDT) -> price
    data.forEach((item) => {
      if (item.symbol.endsWith('USDT')) {
        const cleanSymbol = item.symbol.replace('USDT', '')
        if (symbols.includes(item.symbol)) {
          priceMap.set(cleanSymbol, parseFloat(item.price))
        }
      }
    })

    return priceMap
  } catch (error) {
    console.warn('Error fetching Binance prices for Lighter:', error)
    return priceMap
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
