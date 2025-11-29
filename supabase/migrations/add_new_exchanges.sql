-- Migration: Add support for Hyperliquid, Bybit, MEXC, and Aster exchanges
-- Date: 2025-01-29

-- Add columns for new exchanges to funding_spreads table
ALTER TABLE funding_spreads
  ADD COLUMN IF NOT EXISTS hyperliquid_rate DECIMAL(10, 8),
  ADD COLUMN IF NOT EXISTS bybit_rate DECIMAL(10, 8),
  ADD COLUMN IF NOT EXISTS mexc_rate DECIMAL(10, 8),
  ADD COLUMN IF NOT EXISTS aster_rate DECIMAL(10, 8);

-- Add funding_period_hours column to funding_rates table
-- This is needed to track different funding periods (1h for Hyperliquid, 4h/8h for others)
ALTER TABLE funding_rates
  ADD COLUMN IF NOT EXISTS funding_period_hours INTEGER DEFAULT 8;

-- Update latest_funding_spreads view to include new exchanges
CREATE OR REPLACE VIEW latest_funding_spreads AS
SELECT DISTINCT ON (symbol)
  id,
  symbol,
  binance_rate,
  lighter_rate,
  hyperliquid_rate,
  bybit_rate,
  mexc_rate,
  aster_rate,
  spread_percent,
  binance_mark_price,
  lighter_mark_price,
  created_at
FROM funding_spreads
ORDER BY symbol, created_at DESC;

-- Create indexes for new columns (for better query performance)
CREATE INDEX IF NOT EXISTS idx_funding_spreads_hyperliquid_rate ON funding_spreads(hyperliquid_rate);
CREATE INDEX IF NOT EXISTS idx_funding_spreads_bybit_rate ON funding_spreads(bybit_rate);
CREATE INDEX IF NOT EXISTS idx_funding_spreads_mexc_rate ON funding_spreads(mexc_rate);
CREATE INDEX IF NOT EXISTS idx_funding_spreads_aster_rate ON funding_spreads(aster_rate);

-- Add index on funding_period_hours for funding_rates
CREATE INDEX IF NOT EXISTS idx_funding_rates_period ON funding_rates(funding_period_hours);
