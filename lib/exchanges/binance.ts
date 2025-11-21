import type { BinanceFundingRate, NormalizedFundingRate } from '@/lib/types'

const BINANCE_API_URL = 'https://fapi.binance.com/fapi/v1/premiumIndex'

/**
 * Fetch current funding rates from Binance
 *
 * Binance funding:
 * - Most pairs: 8-hour funding (00:00, 08:00, 16:00 UTC)
 * - Some high-volume pairs: 4-hour funding
 * - We calculate the actual period from fundingTime and nextFundingTime
 */
export async function fetchBinanceFundingRates(): Promise<NormalizedFundingRate[]> {
  try {
    const response = await fetch(BINANCE_API_URL, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Binance API error: ${response.status}`)
    }

    const data: BinanceFundingRate[] = await response.json()
    const now = Date.now()
    const rates: NormalizedFundingRate[] = []

    data.forEach((item) => {
      if (!item.lastFundingRate) return

      const fundingRate = parseFloat(item.lastFundingRate)

      // Calculate actual funding period from timestamps
      const fundingPeriodMs = item.nextFundingTime && item.fundingTime
        ? item.nextFundingTime - item.fundingTime
        : 8 * 60 * 60 * 1000 // Default 8h

      const fundingPeriodHours = fundingPeriodMs / (1000 * 60 * 60)
      // Round to nearest common period (4 or 8)
      const normalizedPeriod = fundingPeriodHours <= 6 ? 4 : 8
      const hourlyRate = fundingRate / normalizedPeriod

      const normalizedSymbol = normalizeSymbol(item.symbol)
      if (!normalizedSymbol) return

      rates.push({
        exchange: 'binance',
        symbol: normalizedSymbol,
        originalSymbol: item.symbol,
        fundingRate,
        fundingPeriodHours: normalizedPeriod,
        hourlyRate,
        markPrice: item.markPrice ? parseFloat(item.markPrice) : undefined,
        nextFundingTime: item.nextFundingTime,
        timestamp: now,
      })
    })

    return rates
  } catch (error) {
    console.error('Error fetching Binance funding rates:', error)
    throw error
  }
}

/**
 * Normalize symbol to common format
 * Binance uses: BTCUSDT, ETHUSDT, 1000PEPEUSDT, etc.
 */
function normalizeSymbol(symbol: string): string | null {
  // Remove USDT suffix
  if (symbol.endsWith('USDT')) {
    return symbol.replace('USDT', '')
  }

  // Skip BUSD and other pairs
  return null
}

/**
 * Get exchange URL for a symbol
 */
export function getBinanceUrl(symbol: string): string {
  const binanceSymbol = symbol.includes('USDT') ? symbol : `${symbol}USDT`
  return `https://www.binance.com/en/futures/${binanceSymbol}`
}
