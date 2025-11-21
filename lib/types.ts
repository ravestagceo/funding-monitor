// ============ Exchange Types ============

export type ExchangeId = 'binance' | 'lighter' | 'hyperliquid' | 'bybit'

export const EXCHANGE_CONFIG: Record<ExchangeId, {
  name: string
  color: string
  fundingPeriodHours: number // Default period, can vary per asset
  type: 'cex' | 'dex'
}> = {
  binance: { name: 'Binance', color: '#f3ba2f', fundingPeriodHours: 8, type: 'cex' },
  lighter: { name: 'Lighter', color: '#10b981', fundingPeriodHours: 8, type: 'dex' },
  hyperliquid: { name: 'Hyperliquid', color: '#84cc16', fundingPeriodHours: 1, type: 'dex' }, // Pays hourly but shows 8h rate
  bybit: { name: 'Bybit', color: '#f7a600', fundingPeriodHours: 8, type: 'cex' },
}

// ============ API Response Types ============

export interface BinanceFundingRate {
  symbol: string
  fundingRate: string
  fundingTime: number
  markPrice: string
  lastFundingRate?: string
  nextFundingTime?: number
}

export interface LighterFundingRate {
  market_id: number
  exchange: string
  symbol: string
  rate: number
}

export interface HyperliquidAssetCtx {
  funding: string // Current funding rate (8h rate, paid hourly at 1/8)
  openInterest: string
  prevDayPx: string
  dayNtlVlm: string
  premium: string
  oraclePx: string
  markPx: string
  midPx?: string
  impactPxs?: string[]
}

export interface HyperliquidMeta {
  universe: Array<{
    name: string
    szDecimals: number
    maxLeverage: number
    onlyIsolated?: boolean
  }>
}

export interface HyperliquidMetaAndAssetCtxs {
  meta: HyperliquidMeta
  assetCtxs: HyperliquidAssetCtx[]
}

export interface BybitTicker {
  symbol: string
  lastPrice: string
  indexPrice: string
  markPrice: string
  prevPrice24h: string
  price24hPcnt: string
  highPrice24h: string
  lowPrice24h: string
  prevPrice1h: string
  openInterest: string
  openInterestValue: string
  turnover24h: string
  volume24h: string
  fundingRate: string
  nextFundingTime: string
  predictedDeliveryPrice?: string
  basisRate?: string
  deliveryFeeRate?: string
  deliveryTime?: string
  ask1Size: string
  bid1Price: string
  ask1Price: string
  bid1Size: string
  basis?: string
}

export interface BybitTickersResponse {
  retCode: number
  retMsg: string
  result: {
    category: string
    list: BybitTicker[]
  }
  time: number
}

// ============ Normalized Types ============

export interface NormalizedFundingRate {
  exchange: ExchangeId
  symbol: string // Normalized symbol (e.g., "BTC", "ETH")
  originalSymbol: string // Original symbol from exchange
  fundingRate: number // Raw rate for the period
  fundingPeriodHours: number // Actual period for this rate
  hourlyRate: number // Normalized to 1 hour
  markPrice?: number
  nextFundingTime?: number
  timestamp: number
}

// ============ Database Types ============

export interface FundingRateDB {
  id?: number
  symbol: string
  exchange: ExchangeId
  funding_rate: number
  funding_period_hours?: number
  mark_price?: number
  next_funding_time?: number
  created_at?: string
  updated_at?: string
}

export interface FundingSpreadDB {
  id?: number
  symbol: string
  binance_rate: number
  lighter_rate: number
  hyperliquid_rate?: number
  bybit_rate?: number
  spread_percent: number
  binance_mark_price?: number
  lighter_mark_price?: number
  created_at?: string
}

// ============ Multi-Exchange Frontend Types ============

export interface ExchangeRate {
  rate: number // Raw rate for the period
  hourlyRate: number // Normalized to hourly
  periodHours: number // Actual funding period
  markPrice?: number
  nextFundingTime?: number
  available: boolean
}

export interface MultiExchangeSpread {
  symbol: string
  exchanges: Partial<Record<ExchangeId, ExchangeRate>>
  bestSpread: {
    longExchange: ExchangeId
    shortExchange: ExchangeId
    spreadHourly: number
    spreadDaily: number
    spreadAnnual: number
  }
  updatedAt: string
}

// Legacy type for backward compatibility
export interface FundingSpread {
  symbol: string
  binanceRate: number
  binanceHourlyRate: number
  binanceNextFunding?: number
  lighterRate: number
  lighterHourlyRate: number
  lighterNextFunding?: number
  spreadHourly: number
  spreadDaily: number
  spreadAnnual: number
  binanceMarkPrice?: number
  updatedAt: string
}

export interface SpreadHistoryPoint {
  timestamp: string
  spread_percent: number
  binance_rate: number
  lighter_rate: number
}

export interface SpreadStatistics {
  avgSpread: number
  medianSpread: number
  minSpread: number
  maxSpread: number
  volatility: number
  stabilityScore: number
  profitableMinutes: number
  totalMinutes: number
}

export interface SpreadHistoryResponse {
  success: boolean
  symbol: string
  period: string
  history: SpreadHistoryPoint[]
  statistics: SpreadStatistics | null
  timestamp: string
}
