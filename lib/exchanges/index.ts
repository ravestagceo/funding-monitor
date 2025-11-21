import type { ExchangeId, NormalizedFundingRate, MultiExchangeSpread, ExchangeRate, EXCHANGE_CONFIG } from '@/lib/types'
import { fetchBinanceFundingRates, getBinanceUrl } from './binance'
import { fetchLighterFundingRates, getLighterUrl } from './lighter'
import { fetchHyperliquidFundingRates, getHyperliquidUrl } from './hyperliquid'
import { fetchBybitFundingRates, getBybitUrl } from './bybit'

export { getBinanceUrl, getLighterUrl, getHyperliquidUrl, getBybitUrl }

/**
 * Fetch funding rates from all exchanges in parallel
 */
export async function fetchAllFundingRates(): Promise<Map<ExchangeId, NormalizedFundingRate[]>> {
  const results = new Map<ExchangeId, NormalizedFundingRate[]>()

  const [binanceRates, lighterRates, hyperliquidRates, bybitRates] = await Promise.allSettled([
    fetchBinanceFundingRates(),
    fetchLighterFundingRates(),
    fetchHyperliquidFundingRates(),
    fetchBybitFundingRates(),
  ])

  if (binanceRates.status === 'fulfilled') {
    results.set('binance', binanceRates.value)
  } else {
    console.error('Failed to fetch Binance rates:', binanceRates.reason)
    results.set('binance', [])
  }

  if (lighterRates.status === 'fulfilled') {
    results.set('lighter', lighterRates.value)
  } else {
    console.error('Failed to fetch Lighter rates:', lighterRates.reason)
    results.set('lighter', [])
  }

  if (hyperliquidRates.status === 'fulfilled') {
    results.set('hyperliquid', hyperliquidRates.value)
  } else {
    console.error('Failed to fetch Hyperliquid rates:', hyperliquidRates.reason)
    results.set('hyperliquid', [])
  }

  if (bybitRates.status === 'fulfilled') {
    results.set('bybit', bybitRates.value)
  } else {
    console.error('Failed to fetch Bybit rates:', bybitRates.reason)
    results.set('bybit', [])
  }

  return results
}

/**
 * Build multi-exchange spread data from all funding rates
 */
export function buildMultiExchangeSpreads(
  allRates: Map<ExchangeId, NormalizedFundingRate[]>
): MultiExchangeSpread[] {
  // Create a map of symbol -> exchanges
  const symbolMap = new Map<string, Map<ExchangeId, NormalizedFundingRate>>()

  allRates.forEach((rates, exchange) => {
    rates.forEach((rate) => {
      if (!symbolMap.has(rate.symbol)) {
        symbolMap.set(rate.symbol, new Map())
      }
      symbolMap.get(rate.symbol)!.set(exchange, rate)
    })
  })

  const spreads: MultiExchangeSpread[] = []
  const now = new Date().toISOString()

  symbolMap.forEach((exchangeRates, symbol) => {
    // Need at least 2 exchanges to calculate spread
    if (exchangeRates.size < 2) return

    const exchanges: Partial<Record<ExchangeId, ExchangeRate>> = {}

    exchangeRates.forEach((rate, exchangeId) => {
      exchanges[exchangeId] = {
        rate: rate.fundingRate,
        hourlyRate: rate.hourlyRate,
        periodHours: rate.fundingPeriodHours,
        markPrice: rate.markPrice,
        nextFundingTime: rate.nextFundingTime,
        available: true,
      }
    })

    // Find best spread (highest absolute difference)
    const bestSpread = findBestSpread(exchangeRates)

    if (bestSpread) {
      spreads.push({
        symbol,
        exchanges,
        bestSpread,
        updatedAt: now,
      })
    }
  })

  // Sort by absolute best spread (descending)
  spreads.sort((a, b) => Math.abs(b.bestSpread.spreadHourly) - Math.abs(a.bestSpread.spreadHourly))

  return spreads
}

/**
 * Find the best spread opportunity between all exchange pairs
 * Returns the pair with highest absolute hourly spread
 */
function findBestSpread(
  exchangeRates: Map<ExchangeId, NormalizedFundingRate>
): MultiExchangeSpread['bestSpread'] | null {
  const exchanges = Array.from(exchangeRates.entries())
  if (exchanges.length < 2) return null

  let bestSpread: MultiExchangeSpread['bestSpread'] | null = null
  let maxAbsSpread = 0

  // Compare all pairs
  for (let i = 0; i < exchanges.length; i++) {
    for (let j = i + 1; j < exchanges.length; j++) {
      const [exchange1, rate1] = exchanges[i]
      const [exchange2, rate2] = exchanges[j]

      // Calculate spread: rate1 - rate2
      const spreadHourly = (rate1.hourlyRate - rate2.hourlyRate) * 100
      const absSpread = Math.abs(spreadHourly)

      if (absSpread > maxAbsSpread) {
        maxAbsSpread = absSpread

        // Determine long/short based on spread direction
        // Positive spread = rate1 > rate2, so short rate1, long rate2
        if (spreadHourly > 0) {
          bestSpread = {
            longExchange: exchange2,
            shortExchange: exchange1,
            spreadHourly: absSpread,
            spreadDaily: absSpread * 24,
            spreadAnnual: absSpread * 24 * 365,
          }
        } else {
          bestSpread = {
            longExchange: exchange1,
            shortExchange: exchange2,
            spreadHourly: absSpread,
            spreadDaily: absSpread * 24,
            spreadAnnual: absSpread * 24 * 365,
          }
        }
      }
    }
  }

  return bestSpread
}

/**
 * Get exchange URL by ID
 */
export function getExchangeUrl(exchangeId: ExchangeId, symbol: string): string {
  switch (exchangeId) {
    case 'binance':
      return getBinanceUrl(symbol)
    case 'lighter':
      return getLighterUrl(symbol)
    case 'hyperliquid':
      return getHyperliquidUrl(symbol)
    case 'bybit':
      return getBybitUrl(symbol)
    default:
      return '#'
  }
}
