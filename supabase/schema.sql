-- Create funding_rates table
CREATE TABLE IF NOT EXISTS funding_rates (
  id BIGSERIAL PRIMARY KEY,
  symbol VARCHAR(50) NOT NULL,
  exchange VARCHAR(20) NOT NULL,
  funding_rate DECIMAL(10, 8) NOT NULL,
  mark_price DECIMAL(20, 8),
  next_funding_time BIGINT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_funding_rates_symbol ON funding_rates(symbol);
CREATE INDEX IF NOT EXISTS idx_funding_rates_exchange ON funding_rates(exchange);
CREATE INDEX IF NOT EXISTS idx_funding_rates_created_at ON funding_rates(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_funding_rates_symbol_exchange ON funding_rates(symbol, exchange);

-- Create funding_spreads table for calculated spreads
CREATE TABLE IF NOT EXISTS funding_spreads (
  id BIGSERIAL PRIMARY KEY,
  symbol VARCHAR(50) NOT NULL,
  binance_rate DECIMAL(10, 8) NOT NULL,
  lighter_rate DECIMAL(10, 8) NOT NULL,
  spread_percent DECIMAL(10, 4) NOT NULL,
  binance_mark_price DECIMAL(20, 8),
  lighter_mark_price DECIMAL(20, 8),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create index for faster queries on spreads
CREATE INDEX IF NOT EXISTS idx_funding_spreads_symbol ON funding_spreads(symbol);
CREATE INDEX IF NOT EXISTS idx_funding_spreads_created_at ON funding_spreads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_funding_spreads_spread ON funding_spreads(spread_percent DESC);

-- Enable Row Level Security
ALTER TABLE funding_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE funding_spreads ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access
CREATE POLICY "Allow public read access on funding_rates" ON funding_rates
  FOR SELECT USING (true);

CREATE POLICY "Allow public read access on funding_spreads" ON funding_spreads
  FOR SELECT USING (true);

-- Create policies for service role insert/update
CREATE POLICY "Allow service role insert on funding_rates" ON funding_rates
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow service role insert on funding_spreads" ON funding_spreads
  FOR INSERT WITH CHECK (true);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to update updated_at on funding_rates
CREATE TRIGGER update_funding_rates_updated_at
  BEFORE UPDATE ON funding_rates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create view for latest funding rates
CREATE OR REPLACE VIEW latest_funding_rates AS
SELECT DISTINCT ON (symbol, exchange)
  id,
  symbol,
  exchange,
  funding_rate,
  mark_price,
  next_funding_time,
  created_at,
  updated_at
FROM funding_rates
ORDER BY symbol, exchange, created_at DESC;

-- Create view for latest spreads
CREATE OR REPLACE VIEW latest_funding_spreads AS
SELECT DISTINCT ON (symbol)
  id,
  symbol,
  binance_rate,
  lighter_rate,
  spread_percent,
  binance_mark_price,
  lighter_mark_price,
  created_at
FROM funding_spreads
ORDER BY symbol, created_at DESC;
