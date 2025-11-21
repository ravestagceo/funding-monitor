import type { HyperliquidMetaAndAssetCtxs, NormalizedFundingRate } from '@/lib/types'

const HYPERLIQUID_API_URL = 'https://api.hyperliquid.xyz/info'

/**
 * Fetch current funding rates from Hyperliquid
 *
 * Hyperliquid funding:
 * - API returns the HOURLY funding rate directly
 * - Funding is paid every hour
 * - UI displays this hourly rate
 * - No conversion needed - the rate IS hourly
 */
export async function fetchHyperliquidFundingRates(): Promise<NormalizedFundingRate[]> {
  try {
    const response = await fetch(HYPERLIQUID_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'metaAndAssetCtxs',
      }),
    })

    if (!response.ok) {
      throw new Error(`Hyperliquid API error: ${response.status}`)
    }

    const data: [HyperliquidMetaAndAssetCtxs['meta'], HyperliquidMetaAndAssetCtxs['assetCtxs']] = await response.json()
    const [meta, assetCtxs] = data

    const now = Date.now()
    const rates: NormalizedFundingRate[] = []

    // Map universe (coin names) to asset contexts
    meta.universe.forEach((asset, index) => {
      const ctx = assetCtxs[index]
      if (!ctx || !ctx.funding) return

      // Hyperliquid API returns HOURLY rate directly
      const hourlyRate = parseFloat(ctx.funding)

      // Store as 1-hour period since rate is already hourly
      const fundingPeriodHours = 1

      rates.push({
        exchange: 'hyperliquid',
        symbol: normalizeSymbol(asset.name),
        originalSymbol: asset.name,
        fundingRate: hourlyRate, // Same as hourlyRate since period is 1h
        fundingPeriodHours,
        hourlyRate,
        markPrice: ctx.markPx ? parseFloat(ctx.markPx) : undefined,
        nextFundingTime: getNextHourlyFundingTime(), // Funding paid every hour
        timestamp: now,
      })
    })

    return rates
  } catch (error) {
    console.error('Error fetching Hyperliquid funding rates:', error)
    throw error
  }
}

/**
 * Normalize symbol to common format
 * Hyperliquid uses: BTC, ETH, SOL, etc.
 */
function normalizeSymbol(symbol: string): string {
  // Hyperliquid symbols are already in clean format
  // Just handle any special cases
  return symbol
    .replace('-PERP', '')
    .replace('PERP', '')
    .toUpperCase()
}

/**
 * Get next hourly funding time (top of the hour)
 */
function getNextHourlyFundingTime(): number {
  const now = new Date()
  const nextHour = new Date(now)
  nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0)
  return nextHour.getTime()
}

/**
 * Get exchange URL for a symbol
 */
export function getHyperliquidUrl(symbol: string): string {
  return `https://app.hyperliquid.xyz/trade/${symbol}`
}
