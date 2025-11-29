import type { MexcFundingRate, NormalizedFundingRate } from '@/lib/types'

const MEXC_API_URL = 'https://contract.mexc.com/api/v1/contract/funding_rate'

/**
 * Fetch current funding rates from MEXC
 *
 * MEXC funding:
 * - Most pairs: 8-hour funding (00:00, 08:00, 16:00 UTC)
 * - Some volatile pairs: 4-hour funding (every 4 hours)
 * - API returns collectCycle (funding period in hours)
 * - Rate returned is for the funding period (4h or 8h)
 * - Symbol format: BTC_USDT (with underscore)
 */
export async function fetchMexcFundingRates(): Promise<NormalizedFundingRate[]> {
  try {
    // MEXC requires symbol parameter for individual rates
    // We need to get all symbols first
    const symbols = await fetchMexcSymbols()

    const now = Date.now()
    const rates: NormalizedFundingRate[] = []

    // Fetch funding rates for each symbol
    // Note: MEXC API allows fetching individual rates per symbol
    for (const symbol of symbols) {
      try {
        const response = await fetch(`${MEXC_API_URL}/${symbol}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) {
          console.warn(`MEXC API error for ${symbol}: ${response.status}`)
          continue
        }

        const data: MexcFundingRate = await response.json()

        // Skip if no valid data
        if (!data.fundingRate || data.fundingRate === 0) {
          continue
        }

        const fundingPeriodHours = data.collectCycle || 8
        const hourlyRate = data.fundingRate / fundingPeriodHours

        const normalizedSymbol = normalizeSymbol(data.symbol)
        if (!normalizedSymbol) continue

        rates.push({
          exchange: 'mexc',
          symbol: normalizedSymbol,
          originalSymbol: data.symbol,
          fundingRate: data.fundingRate,
          fundingPeriodHours,
          hourlyRate,
          nextFundingTime: data.nextSettleTime,
          timestamp: now,
        })
      } catch (error) {
        console.warn(`Error fetching MEXC rate for ${symbol}:`, error)
        continue
      }
    }

    return rates
  } catch (error) {
    console.error('Error fetching MEXC funding rates:', error)
    throw error
  }
}

/**
 * Fetch list of tradeable symbols from MEXC
 * Limited to top 15 most liquid pairs for performance
 */
async function fetchMexcSymbols(): Promise<string[]> {
  // Top liquid USDT perpetual pairs on MEXC
  // Limited list for faster cron execution
  return [
    'BTC_USDT',
    'ETH_USDT',
    'SOL_USDT',
    'BNB_USDT',
    'XRP_USDT',
    'DOGE_USDT',
    'ADA_USDT',
    'AVAX_USDT',
    'DOT_USDT',
    'MATIC_USDT',
    'LINK_USDT',
    'ARB_USDT',
    'OP_USDT',
    'SUI_USDT',
    'INJ_USDT',
  ]
}

/**
 * Normalize symbol to common format
 * MEXC uses: BTC_USDT, ETH_USDT, etc. (with underscore)
 */
function normalizeSymbol(symbol: string): string | null {
  // Remove _USDT suffix
  if (symbol.endsWith('_USDT')) {
    return symbol.replace('_USDT', '')
  }

  // Skip other pairs for now
  return null
}

/**
 * Get exchange URL for a symbol
 */
export function getMexcUrl(symbol: string): string {
  // MEXC uses format like BTC_USDT
  const mexcSymbol = symbol.includes('_USDT') ? symbol : `${symbol}_USDT`
  return `https://www.mexc.com/exchange/${mexcSymbol}`
}
