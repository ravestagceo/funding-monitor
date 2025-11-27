'use client'

import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts'
import { RefreshCw, TrendingUp, TrendingDown, Activity, DollarSign } from 'lucide-react'
import type { SpreadHistoryResponse, ExchangeId } from '@/lib/types'
import { EXCHANGE_CONFIG } from '@/lib/types'
import { PriceSpreadTab } from './price-spread-tab'

interface SpreadHistoryModalProps {
  symbol: string
  open: boolean
  onOpenChange: (open: boolean) => void
  availableExchanges?: ExchangeId[]  // Optional: list of exchanges available for this symbol
  initialExchange1?: ExchangeId  // Optional: initial value for exchange 1
  initialExchange2?: ExchangeId  // Optional: initial value for exchange 2
}

export function SpreadHistoryModal({
  symbol,
  open,
  onOpenChange,
  availableExchanges = ['binance', 'lighter'],
  initialExchange1 = 'binance',
  initialExchange2 = 'hyperliquid'
}: SpreadHistoryModalProps) {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<SpreadHistoryResponse | null>(null)
  const [hours, setHours] = useState(6)
  const [activeTab, setActiveTab] = useState('funding')
  const [selectedExchange1, setSelectedExchange1] = useState<ExchangeId>(initialExchange1)
  const [selectedExchange2, setSelectedExchange2] = useState<ExchangeId>(initialExchange2)

  useEffect(() => {
    if (open && symbol) {
      fetchHistory()
    }
  }, [open, symbol, hours, selectedExchange1, selectedExchange2])

  useEffect(() => {
    if (open) {
      // Validate that initial exchanges are in availableExchanges
      const validExchange1 = availableExchanges.includes(initialExchange1)
        ? initialExchange1
        : availableExchanges[0]

      const validExchange2 = availableExchanges.includes(initialExchange2) && initialExchange2 !== validExchange1
        ? initialExchange2
        : availableExchanges.find(ex => ex !== validExchange1) || availableExchanges[1]

      setSelectedExchange1(validExchange1)
      setSelectedExchange2(validExchange2)
    }
  }, [open, initialExchange1, initialExchange2, availableExchanges])

  const fetchHistory = async () => {
    setLoading(true)
    try {
      const response = await fetch(
        `/api/funding/history/${symbol}?hours=${hours}&exchange1=${selectedExchange1}&exchange2=${selectedExchange2}`
      )
      const result = await response.json()
      if (result.success) {
        setData(result)
      }
    } catch (error) {
      console.error('Error fetching history:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  }

  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(4)}%`
  }

  const getStabilityColor = (score: number) => {
    if (score >= 80) return 'success'
    if (score >= 40) return 'warning'
    return 'destructive'
  }

  const getStabilityLabel = (score: number) => {
    if (score >= 80) return 'High Stability'
    if (score >= 40) return 'Medium Stability'
    return 'Low Stability'
  }

  const chartData = data?.history.map((point) => ({
    time: formatTime(point.timestamp),
    spread: point.spread_percent,
    exchange1: point.exchange1_rate * 100,
    exchange2: point.exchange2_rate * 100,
  })) || []

  // Get exchange configs for colors and names
  const ex1Config = EXCHANGE_CONFIG[selectedExchange1]
  const ex2Config = EXCHANGE_CONFIG[selectedExchange2]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Activity className="h-6 w-6" />
            {symbol} Spread History
          </DialogTitle>
          <DialogDescription>
            Funding rate and price spread analysis across exchanges
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="funding" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Funding Spread
            </TabsTrigger>
            <TabsTrigger value="price" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Price Spread
            </TabsTrigger>
          </TabsList>

          <TabsContent value="funding" className="space-y-6">
            {/* Time Period Selector */}
            <div className="flex gap-2">
            {[1, 6, 12, 24].map((h) => (
              <button
                key={h}
                onClick={() => setHours(h)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  hours === h
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
              >
                {h}h
              </button>
            ))}
            <button
              onClick={fetchHistory}
              disabled={loading}
              className="ml-auto px-4 py-2 rounded-md bg-secondary hover:bg-secondary/80 transition-colors disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Exchange Selector */}
          {availableExchanges.length >= 2 && (
            <div className="flex gap-4 items-center bg-card border border-border rounded-lg p-4">
              <div className="flex items-center gap-2">
                <label className="text-sm text-muted-foreground">Exchange 1:</label>
                <select
                  value={selectedExchange1}
                  onChange={(e) => setSelectedExchange1(e.target.value as ExchangeId)}
                  className="px-3 py-2 rounded-md bg-background border border-border text-foreground"
                >
                  {availableExchanges.map(ex => (
                    <option key={ex} value={ex}>{ex.charAt(0).toUpperCase() + ex.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-muted-foreground">Exchange 2:</label>
                <select
                  value={selectedExchange2}
                  onChange={(e) => setSelectedExchange2(e.target.value as ExchangeId)}
                  className="px-3 py-2 rounded-md bg-background border border-border text-foreground"
                >
                  {availableExchanges.filter(ex => ex !== selectedExchange1).map(ex => (
                    <option key={ex} value={ex}>{ex.charAt(0).toUpperCase() + ex.slice(1)}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {loading && !data ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : data?.statistics ? (
            <>
              {/* Statistics Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-card border border-border rounded-lg p-4">
                  <div className="text-xs text-muted-foreground mb-1">Avg Spread</div>
                  <div className="text-lg font-bold text-foreground">
                    {formatPercent(data.statistics.avgSpread)}
                  </div>
                </div>
                <div className="bg-card border border-border rounded-lg p-4">
                  <div className="text-xs text-muted-foreground mb-1">Volatility</div>
                  <div className="text-lg font-bold text-foreground">
                    {data.statistics.volatility.toFixed(4)}%
                  </div>
                </div>
                <div className="bg-card border border-border rounded-lg p-4">
                  <div className="text-xs text-muted-foreground mb-1">Min / Max</div>
                  <div className="text-sm font-bold text-foreground">
                    {formatPercent(data.statistics.minSpread)} / {formatPercent(data.statistics.maxSpread)}
                  </div>
                </div>
                <div className="bg-card border border-border rounded-lg p-4">
                  <div className="text-xs text-muted-foreground mb-1">Stability</div>
                  <Badge variant={getStabilityColor(data.statistics.stabilityScore)}>
                    {data.statistics.stabilityScore.toFixed(0)}%
                  </Badge>
                  <div className="text-xs text-muted-foreground mt-1">
                    {getStabilityLabel(data.statistics.stabilityScore)}
                  </div>
                </div>
              </div>

              {/* Spread Chart */}
              <div className="bg-card border border-border rounded-lg p-4">
                <h3 className="text-sm font-semibold mb-4 text-card-foreground">Spread Over Time</h3>
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
                      formatter={(value: number) => [`${value.toFixed(4)}%`, 'Spread']}
                    />
                    <Area
                      type="monotone"
                      dataKey="spread"
                      stroke="hsl(var(--primary))"
                      fill="hsl(var(--primary) / 0.2)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Rates Comparison Chart */}
              <div className="bg-card border border-border rounded-lg p-4">
                <h3 className="text-sm font-semibold mb-4 text-card-foreground">Funding Rates Comparison</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={chartData} key={`${selectedExchange1}-${selectedExchange2}`}>
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
                      formatter={(value: number, name: string) => {
                        const isLong = name === 'exchange1'
                        return [
                          `${value.toFixed(4)}%`,
                          `${isLong ? ex1Config.name + ' (Long)' : ex2Config.name + ' (Short)'}`,
                        ]
                      }}
                      itemStyle={{
                        color: 'hsl(var(--popover-foreground))',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="exchange1"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={false}
                      name="exchange1"
                    />
                    <Line
                      type="monotone"
                      dataKey="exchange2"
                      stroke="#ef4444"
                      strokeWidth={2}
                      dot={false}
                      name="exchange2"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Profitability Info */}
              <div className="bg-accent/30 border border-border rounded-lg p-4">
                <div className="flex items-start gap-3">
                  {data.statistics.stabilityScore >= 50 ? (
                    <TrendingUp className="h-5 w-5 text-green-400 mt-0.5" />
                  ) : (
                    <TrendingDown className="h-5 w-5 text-red-400 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <div className="font-semibold text-foreground mb-1">Profitability Analysis</div>
                    <div className="text-sm text-muted-foreground">
                      Spread was profitable (&gt;0.01%) for{' '}
                      <span className="font-bold text-foreground">
                        {data.statistics.profitableMinutes} out of {data.statistics.totalMinutes}
                      </span>{' '}
                      data points ({data.statistics.stabilityScore.toFixed(1)}% of the time).
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              No historical data available for this symbol
            </div>
          )}
          </TabsContent>

          <TabsContent value="price" className="space-y-6">
            {/* Time Period Selector */}
            <div className="flex gap-2 items-center">
              {[1, 6, 12, 24].map((h) => (
                <button
                  key={h}
                  onClick={() => setHours(h)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    hours === h
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                  }`}
                >
                  {h}h
                </button>
              ))}
            </div>

            {/* Exchange Selector */}
            {availableExchanges.length >= 2 && (
              <div className="flex gap-4 items-center bg-card border border-border rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <label className="text-sm text-muted-foreground">Exchange 1:</label>
                  <select
                    value={selectedExchange1}
                    onChange={(e) => setSelectedExchange1(e.target.value as ExchangeId)}
                    className="px-3 py-2 rounded-md bg-background border border-border text-foreground"
                  >
                    {availableExchanges.map(ex => (
                      <option key={ex} value={ex}>{ex.charAt(0).toUpperCase() + ex.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-muted-foreground">Exchange 2:</label>
                  <select
                    value={selectedExchange2}
                    onChange={(e) => setSelectedExchange2(e.target.value as ExchangeId)}
                    className="px-3 py-2 rounded-md bg-background border border-border text-foreground"
                  >
                    {availableExchanges.filter(ex => ex !== selectedExchange1).map(ex => (
                      <option key={ex} value={ex}>{ex.charAt(0).toUpperCase() + ex.slice(1)}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <PriceSpreadTab
              symbol={symbol}
              exchange1={selectedExchange1}
              exchange2={selectedExchange2}
              hours={hours}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
