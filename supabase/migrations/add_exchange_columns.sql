-- Drop the existing view first
DROP VIEW IF EXISTS latest_funding_spreads;

-- Add columns for new exchanges to funding_spreads table
ALTER TABLE funding_spreads
ADD COLUMN IF NOT EXISTS hyperliquid_rate DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS bybit_rate DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS mexc_rate DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS aster_rate DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS hyperliquid_mark_price DECIMAL(20, 8),
ADD COLUMN IF NOT EXISTS bybit_mark_price DECIMAL(20, 8),
ADD COLUMN IF NOT EXISTS mexc_mark_price DECIMAL(20, 8),
ADD COLUMN IF NOT EXISTS aster_mark_price DECIMAL(20, 8);

-- Recreate the latest_funding_spreads view with all columns
CREATE VIEW latest_funding_spreads AS
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
  hyperliquid_mark_price,
  bybit_mark_price,
  mexc_mark_price,
  aster_mark_price,
  created_at
FROM funding_spreads
ORDER BY symbol, created_at DESC;
