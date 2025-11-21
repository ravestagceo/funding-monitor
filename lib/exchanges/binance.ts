import type { BinanceFundingRate, NormalizedFundingRate } from '@/lib/types'

const BINANCE_PREMIUM_URL = 'https://fapi.binance.com/fapi/v1/premiumIndex'
const BINANCE_FUNDING_INFO_URL = 'https://fapi.binance.com/fapi/v1/fundingInfo'

interface BinanceFundingInfo {
  symbol: string
  fundingIntervalHours: number
}

/**
 * Fetch current funding rates from Binance
 *
 * Binance funding:
 * - Most pairs: 8-hour funding (00:00, 08:00, 16:00 UTC)
 * - Some high-volume pairs: 4-hour funding
 * - We fetch fundingInfo to get the actual interval per symbol
 */
export async function fetchBinanceFundingRates(): Promise<NormalizedFundingRate[]> {
  try {
    // Fetch both endpoints in parallel
    const [premiumRes, fundingInfoRes] = await Promise.all([
      fetch(BINANCE_PREMIUM_URL, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      }),
      fetch(BINANCE_FUNDING_INFO_URL, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      }),
    ])

    if (!premiumRes.ok) {
      throw new Error(`Binance premiumIndex API error: ${premiumRes.status}`)
    }

    const data: BinanceFundingRate[] = await premiumRes.json()

    // Build map of symbol -> fundingIntervalHours
    // IMPORTANT: Only symbols in fundingInfo are actually tradeable on futures
    const fundingIntervalMap = new Map<string, number>()
    if (fundingInfoRes.ok) {
      const fundingInfo: BinanceFundingInfo[] = await fundingInfoRes.json()
      fundingInfo.forEach((info) => {
        fundingIntervalMap.set(info.symbol, info.fundingIntervalHours)
      })
    }

    const now = Date.now()
    const rates: NormalizedFundingRate[] = []

    data.forEach((item) => {
      if (!item.lastFundingRate) return

      // Skip symbols not in fundingInfo - they may be delisted or spot-only
      // premiumIndex can return stale data for non-existent futures
      const fundingPeriodHours = fundingIntervalMap.get(item.symbol)
      if (!fundingPeriodHours) return

      const fundingRate = parseFloat(item.lastFundingRate)
      const hourlyRate = fundingRate / fundingPeriodHours

      const normalizedSymbol = normalizeSymbol(item.symbol)
      if (!normalizedSymbol) return

      rates.push({
        exchange: 'binance',
        symbol: normalizedSymbol,
        originalSymbol: item.symbol,
        fundingRate,
        fundingPeriodHours,
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
