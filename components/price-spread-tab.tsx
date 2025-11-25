'use client'

import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart, ComposedChart } from 'recharts'
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
    fetchHistory()
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

  const chartData = data?.history.map((point) => ({
    time: formatTime(point.timestamp),
    exchange1: point.exchange1_price,
    exchange2: point.exchange2_price,
    spreadAbsolute: point.spread_absolute,
    spreadPercent: point.spread_percent,
  })) || []

  const ex1Config = EXCHANGE_CONFIG[exchange1]
  const ex2Config = EXCHANGE_CONFIG[exchange2]

  // Calculate dynamic Y-axis domain for better zoom on small spreads
  const calculateYDomain = () => {
    if (!chartData.length) return undefined

    const allPrices = chartData.flatMap(d => [d.exchange1, d.exchange2])
    const minPrice = Math.min(...allPrices)
    const maxPrice = Math.max(...allPrices)
    const range = maxPrice - minPrice

    // Add 10% padding on each side, or use a minimum range of 0.5% of the price
    const padding = Math.max(range * 0.1, minPrice * 0.005)

    return [minPrice - padding, maxPrice + padding]
  }

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
                  domain={calculateYDomain()}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                    color: 'hsl(var(--popover-foreground))',
                  }}
                  formatter={(value: number, name: string) => [
                    formatPrice(value),
                    name === 'exchange1' ? ex1Config.name : ex2Config.name,
                  ]}
                />
                <Line
                  type="monotone"
                  dataKey="exchange1"
                  stroke={ex1Config.color}
                  strokeWidth={2}
                  dot={false}
                  name="exchange1"
                />
                <Line
                  type="monotone"
                  dataKey="exchange2"
                  stroke={ex2Config.color}
                  strokeWidth={2}
                  dot={false}
                  name="exchange2"
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
                  formatter={(value: number) => [formatPercent(value), 'Spread %']}
                />
                <Area
                  type="monotone"
                  dataKey="spreadPercent"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary) / 0.2)"
                  strokeWidth={2}
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
                  formatter={(value: number) => [`$${value.toFixed(4)}`, 'Spread']}
                />
                <Area
                  type="monotone"
                  dataKey="spreadAbsolute"
                  stroke="hsl(var(--chart-2))"
                  fill="hsl(var(--chart-2) / 0.2)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Info Box */}
          <div className="bg-accent/30 border border-border rounded-lg p-4">
            <div className="text-sm text-muted-foreground">
              <strong className="text-foreground">Price Spread:</strong> Shows the difference between mark prices on{' '}
              <span style={{ color: ex1Config.color }} className="font-semibold">{ex1Config.name}</span> and{' '}
              <span style={{ color: ex2Config.color }} className="font-semibold">{ex2Config.name}</span>.
              Positive spread means {ex1Config.name} price is higher.
              Based on {data.statistics.totalPoints} data points over the last {hours} hours.
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
