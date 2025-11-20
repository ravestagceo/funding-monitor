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

export interface FundingRateDB {
  id?: number
  symbol: string
  exchange: 'binance' | 'lighter'
  funding_rate: number
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
  spread_percent: number
  binance_mark_price?: number
  lighter_mark_price?: number
  created_at?: string
}

export interface FundingSpread {
  symbol: string
  binanceRate: number
  lighterRate: number
  spreadPercent: number
  binanceMarkPrice?: number
  lighterMarkPrice?: number
  annualizedSpread?: number
  updatedAt: string
}
