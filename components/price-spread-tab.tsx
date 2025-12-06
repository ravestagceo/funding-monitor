'use client'

import { useEffect, useState, useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart, ComposedChart, ReferenceLine } from 'recharts'
import { RefreshCw, DollarSign, Percent } from 'lucide-react'
import type { PriceSpreadHistoryResponse, ExchangeId } from '@/lib/types'
import { EXCHANGE_CONFIG } from '@/lib/types'

interface PriceSpreadTabProps {
  symbol: string
  exchange1: ExchangeId
  exchange2: ExchangeId
  hours: number
  onRefresh?: () => void
}

export function PriceSpreadTab({ symbol, exchange1, exchange2, hours, onRefresh }: PriceSpreadTabProps) {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<PriceSpreadHistoryResponse | null>(null)

  useEffect(() => {
    // Only fetch if all parameters are available
    if (symbol && exchange1 && exchange2 && hours) {
      fetchHistory()
    }
  }, [symbol, exchange1, exchange2, hours])

  const fetchHistory = async () => {
    setLoading(true)
    try {
      const response = await fetch(
        `/api/funding/price-history/${symbol}?hours=${hours}&exchange1=${exchange1}&exchange2=${exchange2}`
      )
      const result = await response.json()
      if (result.success) {
        setData(result)
      }
    } catch (error) {
      console.error('Error fetching price history:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  }

  const formatPrice = (value: number) => {
    return `$${value.toFixed(4)}`
  }

  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(4)}%`
  }

  // Memoize chart data to prevent unnecessary recalculations
  const chartData = useMemo(() => {
    return data?.history.map((point) => ({
      time: formatTime(point.timestamp),
      exchange1: point.exchange1_price,
      exchange2: point.exchange2_price,
      spreadAbsolute: point.spread_absolute,
      spreadPercent: point.spread_percent,
    })) || []
  }, [data?.history])

  const ex1Config = EXCHANGE_CONFIG[exchange1]
  const ex2Config = EXCHANGE_CONFIG[exchange2]

  // Calculate dynamic Y-axis domain for better zoom on small spreads
  const yDomain = useMemo(() => {
    if (!chartData.length) return undefined

    const allPrices = chartData.flatMap(d => [d.exchange1, d.exchange2])
    const minPrice = Math.min(...allPrices)
    const maxPrice = Math.max(...allPrices)
    const range = maxPrice - minPrice

    // Add 10% padding on each side, or use a minimum range of 0.5% of the price
    const padding = Math.max(range * 0.1, minPrice * 0.005)

    return [minPrice - padding, maxPrice + padding]
  }, [chartData])

  return (
    <div className="space-y-6">
      {loading && !data ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : data?.statistics ? (
        <>
          {/* Statistics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                <Percent className="h-3 w-3" />
                Avg Spread %
              </div>
              <div className="text-lg font-bold text-foreground">
                {formatPercent(data.statistics.avgSpreadPercent)}
              </div>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                Avg Spread USD
              </div>
              <div className="text-lg font-bold text-foreground">
                ${data.statistics.avgSpreadAbsolute.toFixed(4)}
              </div>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="text-xs text-muted-foreground mb-1">Min / Max %</div>
              <div className="text-sm font-bold text-foreground">
                {formatPercent(data.statistics.minSpreadPercent)} / {formatPercent(data.statistics.maxSpreadPercent)}
              </div>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="text-xs text-muted-foreground mb-1">Volatility</div>
              <div className="text-lg font-bold text-foreground">
                {data.statistics.volatility.toFixed(4)}%
              </div>
            </div>
          </div>

          {/* Price Comparison Chart */}
          <div className="bg-card border border-border rounded-lg p-4">
            <h3 className="text-sm font-semibold mb-4 text-card-foreground">Mark Price Comparison</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="time"
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  tickFormatter={(value) => `$${value.toFixed(4)}`}
                  domain={yDomain}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                    color: 'hsl(var(--popover-foreground))',
                  }}
                  content={({ active, payload }) => {
                    if (!active || !payload || payload.length === 0) return null

                    const ex1Price = payload.find(p => p.dataKey === 'exchange1')?.value as number
                    const ex2Price = payload.find(p => p.dataKey === 'exchange2')?.value as number

                    if (!ex1Price || !ex2Price) return null

                    const spreadAbsolute = ex1Price - ex2Price
                    const spreadPercent = (spreadAbsolute / ex2Price) * 100

                    return (
                      <div className="bg-popover border border-border rounded-md p-3">
                        <div className="text-xs text-muted-foreground mb-2">{payload[0].payload.time}</div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded" style={{ backgroundColor: ex1Config.color }} />
                            <span className="text-sm">{ex1Config.name}:</span>
                            <span className="text-sm font-semibold">{formatPrice(ex1Price)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded" style={{ backgroundColor: ex2Config.color }} />
                            <span className="text-sm">{ex2Config.name}:</span>
                            <span className="text-sm font-semibold">{formatPrice(ex2Price)}</span>
                          </div>
                          <div className="border-t border-border mt-2 pt-2">
                            <div className="text-xs text-muted-foreground">Spread:</div>
                            <div className="flex gap-3 text-sm font-semibold">
                              <span>{spreadPercent >= 0 ? '+' : ''}{spreadPercent.toFixed(4)}%</span>
                              <span>${spreadAbsolute.toFixed(4)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="exchange1"
                  stroke={ex1Config.color}
                  strokeWidth={2}
                  dot={false}
                  name="exchange1"
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="exchange2"
                  stroke={ex2Config.color}
                  strokeWidth={2}
                  dot={false}
                  name="exchange2"
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Spread Percent Chart */}
          <div className="bg-card border border-border rounded-lg p-4">
            <h3 className="text-sm font-semibold mb-4 text-card-foreground">Price Spread % Over Time</h3>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="time"
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  tickFormatter={(value) => `${value.toFixed(2)}%`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                    color: 'hsl(var(--popover-foreground))',
                  }}
                  formatter={(value: number) => {
                    const isGoodEntry = value < 0
                    return [
                      formatPercent(value),
                      isGoodEntry ? 'Spread % (Good Entry)' : 'Spread % (Poor Entry)'
                    ]
                  }}
                />
                <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
                <Area
                  type="monotone"
                  dataKey="spreadPercent"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary) / 0.2)"
                  strokeWidth={2}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Spread Absolute Chart */}
          <div className="bg-card border border-border rounded-lg p-4">
            <h3 className="text-sm font-semibold mb-4 text-card-foreground">Price Spread USD Over Time</h3>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="time"
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  tickFormatter={(value) => `$${value.toFixed(4)}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                    color: 'hsl(var(--popover-foreground))',
                  }}
                  formatter={(value: number) => {
                    const isGoodEntry = value < 0
                    return [
                      `$${value.toFixed(4)}`,
                      isGoodEntry ? 'Spread (Good Entry)' : 'Spread (Poor Entry)'
                    ]
                  }}
                />
                <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
                <Area
                  type="monotone"
                  dataKey="spreadAbsolute"
                  stroke="hsl(var(--chart-2))"
                  fill="hsl(var(--chart-2) / 0.2)"
                  strokeWidth={2}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Info Box */}
          <div className="bg-accent/30 border border-border rounded-lg p-4">
            <div className="text-sm text-muted-foreground space-y-2">
              <div>
                <strong className="text-foreground">Price Spread Interpretation:</strong> Shows the difference between mark prices on{' '}
                <span style={{ color: ex1Config.color }} className="font-semibold">{ex1Config.name}</span> and{' '}
                <span style={{ color: ex2Config.color }} className="font-semibold">{ex2Config.name}</span>.
              </div>
              <div className="pl-4 border-l-2 border-border">
                <div className="text-green-400 font-semibold">✓ Good Entry (Negative Spread):</div>
                <div className="text-xs">
                  {ex1Config.name} price {'<'} {ex2Config.name} price → Buy cheaper, sell higher → Potential profit on convergence
                </div>
              </div>
              <div className="pl-4 border-l-2 border-border">
                <div className="text-red-400 font-semibold">✗ Poor Entry (Positive Spread):</div>
                <div className="text-xs">
                  {ex1Config.name} price {'>'} {ex2Config.name} price → Buy expensive, sell cheap → Potential loss on convergence
                </div>
              </div>
              <div className="text-xs opacity-75">
                Based on {data.statistics.totalPoints} data points over the last {hours} hours.
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          No price history data available for this symbol on these exchanges
        </div>
      )}
    </div>
  )
}
