import type { BybitTickersResponse, NormalizedFundingRate } from '@/lib/types'

const BYBIT_API_URL = 'https://api.bybit.com/v5/market/tickers'

/**
 * Fetch current funding rates from Bybit
 *
 * Bybit funding:
 * - Some pairs: 8-hour funding (00:00, 08:00, 16:00 UTC)
 * - Some pairs: 4-hour funding (every 4 hours)
 * - API returns fundingIntervalHour for each symbol
 * - Rate returned is for the funding period (4h or 8h)
 */
export async function fetchBybitFundingRates(): Promise<NormalizedFundingRate[]> {
  try {
    // Fetch linear perpetuals (USDT)
    const response = await fetch(`${BYBIT_API_URL}?category=linear`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Bybit API error: ${response.status}`)
    }

    const data: BybitTickersResponse = await response.json()

    if (data.retCode !== 0) {
      throw new Error(`Bybit API error: ${data.retMsg}`)
    }

    const now = Date.now()
    const rates: NormalizedFundingRate[] = []

    data.result.list.forEach((ticker) => {
      // Skip delivery contracts and spot
      if (!ticker.fundingRate || !ticker.symbol.endsWith('USDT')) {
        return
      }

      const fundingRate = parseFloat(ticker.fundingRate)
      const nextFundingTime = ticker.nextFundingTime ? parseInt(ticker.nextFundingTime, 10) : undefined

      // Use fundingIntervalHour from API (4 or 8), default to 8
      const fundingPeriodHours = ticker.fundingIntervalHour
        ? parseInt(ticker.fundingIntervalHour, 10)
        : 8
      const hourlyRate = fundingRate / fundingPeriodHours

      const normalizedSymbol = normalizeSymbol(ticker.symbol)
      if (!normalizedSymbol) return

      rates.push({
        exchange: 'bybit',
        symbol: normalizedSymbol,
        originalSymbol: ticker.symbol,
        fundingRate,
        fundingPeriodHours,
        hourlyRate,
        markPrice: ticker.markPrice ? parseFloat(ticker.markPrice) : undefined,
        nextFundingTime,
        timestamp: now,
      })
    })

    return rates
  } catch (error) {
    console.error('Error fetching Bybit funding rates:', error)
    throw error
  }
}

/**
 * Normalize symbol to common format
 * Bybit uses: BTCUSDT, ETHUSDT, etc.
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
export function getBybitUrl(symbol: string): string {
  // Bybit uses format like BTCUSDT
  const bybitSymbol = symbol.includes('USDT') ? symbol : `${symbol}USDT`
  return `https://www.bybit.com/trade/usdt/${bybitSymbol}`
}
