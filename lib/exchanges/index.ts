import type { ExchangeId, NormalizedFundingRate, MultiExchangeSpread, ExchangeRate, EXCHANGE_CONFIG } from '@/lib/types'
import { fetchBinanceFundingRates, getBinanceUrl } from './binance'
import { fetchLighterFundingRates, getLighterUrl } from './lighter'
import { fetchHyperliquidFundingRates, getHyperliquidUrl } from './hyperliquid'
import { fetchBybitFundingRates, getBybitUrl } from './bybit'
import { fetchMexcFundingRates, getMexcUrl } from './mexc'
import { fetchAsterFundingRates, getAsterUrl } from './aster'

export { getBinanceUrl, getLighterUrl, getHyperliquidUrl, getBybitUrl, getMexcUrl, getAsterUrl }

/**
 * Fetch funding rates from all exchanges in parallel
 */
export async function fetchAllFundingRates(): Promise<Map<ExchangeId, NormalizedFundingRate[]>> {
  const results = new Map<ExchangeId, NormalizedFundingRate[]>()

  const [binanceRates, lighterRates, hyperliquidRates, bybitRates, mexcRates, asterRates] = await Promise.allSettled([
    fetchBinanceFundingRates(),
    fetchLighterFundingRates(),
    fetchHyperliquidFundingRates(),
    fetchBybitFundingRates(),
    fetchMexcFundingRates(),
    fetchAsterFundingRates(),
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

  if (mexcRates.status === 'fulfilled') {
    results.set('mexc', mexcRates.value)
  } else {
    console.error('Failed to fetch MEXC rates:', mexcRates.reason)
    results.set('mexc', [])
  }

  if (asterRates.status === 'fulfilled') {
    results.set('aster', asterRates.value)
  } else {
    console.error('Failed to fetch Aster rates:', asterRates.reason)
    results.set('aster', [])
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
 * Returns the pair with highest profit potential
 *
 * CORRECT FUNDING ARBITRAGE LOGIC:
 * - LONG on exchange with LOWER funding rate (especially negative)
 * - SHORT on exchange with HIGHER funding rate (especially positive)
 * - Spread = ShortRate - LongRate (ALWAYS POSITIVE for profit!)
 *
 * Example:
 * - Exchange A: +0.2255% (high positive)
 * - Exchange B: -0.0095% (low negative)
 * - Strategy: LONG B, SHORT A
 * - Spread = 0.2255% - (-0.0095%) = 0.2350% profit
 */
function findBestSpread(
  exchangeRates: Map<ExchangeId, NormalizedFundingRate>
): MultiExchangeSpread['bestSpread'] | null {
  const exchanges = Array.from(exchangeRates.entries())
  if (exchanges.length < 2) return null

  let bestSpread: MultiExchangeSpread['bestSpread'] | null = null
  let maxSpread = 0

  // Compare all pairs
  for (let i = 0; i < exchanges.length; i++) {
    for (let j = i + 1; j < exchanges.length; j++) {
      const [exchangeA, rateA] = exchanges[i]
      const [exchangeB, rateB] = exchanges[j]

      // Try both combinations to find the best profit
      // Option 1: Long A, Short B
      const spreadAB = (rateB.hourlyRate - rateA.hourlyRate) * 100

      // Option 2: Long B, Short A
      const spreadBA = (rateA.hourlyRate - rateB.hourlyRate) * 100

      // Pick the combination with higher spread
      if (spreadAB > maxSpread) {
        maxSpread = spreadAB
        bestSpread = {
          longExchange: exchangeA,   // Long on lower rate
          shortExchange: exchangeB,  // Short on higher rate
          spreadHourly: spreadAB,
          spreadDaily: spreadAB * 24,
          spreadAnnual: spreadAB * 24 * 365,
        }
      }

      if (spreadBA > maxSpread) {
        maxSpread = spreadBA
        bestSpread = {
          longExchange: exchangeB,   // Long on lower rate
          shortExchange: exchangeA,  // Short on higher rate
          spreadHourly: spreadBA,
          spreadDaily: spreadBA * 24,
          spreadAnnual: spreadBA * 24 * 365,
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
    case 'mexc':
      return getMexcUrl(symbol)
    case 'aster':
      return getAsterUrl(symbol)
    default:
      return '#'
  }
}
