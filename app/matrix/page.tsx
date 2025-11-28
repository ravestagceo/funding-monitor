'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ArrowUpDown, RefreshCw, TrendingUp, ExternalLink, ArrowRight } from 'lucide-react'
import type { MultiExchangeSpread, ExchangeId } from '@/lib/types'
import { EXCHANGE_CONFIG } from '@/lib/types'
import { SpreadHistoryModal } from '@/components/spread-history-modal'

const EXCHANGES: ExchangeId[] = ['binance', 'hyperliquid', 'bybit', 'lighter']

export default function MatrixPage() {
  const [spreads, setSpreads] = useState<MultiExchangeSpread[]>([])
  const [filteredSpreads, setFilteredSpreads] = useState<MultiExchangeSpread[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<'symbol' | 'spread'>('spread')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [lastUpdate, setLastUpdate] = useState<string>('')
  const [stats, setStats] = useState<Record<string, number>>({})
  const [selectedSymbol, setSelectedSymbol] = useState<string>('')
  const [modalOpen, setModalOpen] = useState(false)
  const [availableExchanges, setAvailableExchanges] = useState<ExchangeId[]>([])
  const [selectedExchange1, setSelectedExchange1] = useState<ExchangeId>('binance')
  const [selectedExchange2, setSelectedExchange2] = useState<ExchangeId>('hyperliquid')

  const fetchSpreads = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/funding/multi-spreads')
      const result = await response.json()

      if (result.success) {
        setSpreads(result.data)
        setFilteredSpreads(result.data)
        setLastUpdate(result.timestamp)
        setStats(result.stats)
      }
    } catch (error) {
      console.error('Error fetching spreads:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSpreads()
    const interval = setInterval(fetchSpreads, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    let filtered = spreads.filter((spread) =>
      spread.symbol.toLowerCase().includes(searchTerm.toLowerCase())
    )

    filtered.sort((a, b) => {
      if (sortBy === 'symbol') {
        return sortOrder === 'asc'
          ? a.symbol.localeCompare(b.symbol)
          : b.symbol.localeCompare(a.symbol)
      }
      return sortOrder === 'asc'
        ? a.bestSpread.spreadHourly - b.bestSpread.spreadHourly
        : b.bestSpread.spreadHourly - a.bestSpread.spreadHourly
    })

    setFilteredSpreads(filtered)
  }, [searchTerm, spreads, sortBy, sortOrder])

  const handleSort = (column: 'symbol' | 'spread') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(column)
      setSortOrder('desc')
    }
  }

  const formatRate = (rate: number) => {
    const formatted = (rate * 100).toFixed(4)
    return rate >= 0 ? `+${formatted}%` : `${formatted}%`
  }

  const formatSpread = (spread: number) => {
    return `${spread.toFixed(4)}%`
  }

  const getRateColor = (rate: number) => {
    if (rate > 0.0001) return 'text-green-400'
    if (rate < -0.0001) return 'text-red-400'
    return 'text-muted-foreground'
  }

  const getSpreadColor = (spread: number) => {
    if (spread > 0.05) return 'text-green-400 font-bold'
    if (spread > 0.02) return 'text-emerald-400 font-semibold'
    if (spread > 0.01) return 'text-teal-400'
    return 'text-gray-400'
  }

  const getExchangeUrl = (exchange: ExchangeId, symbol: string) => {
    switch (exchange) {
      case 'binance':
        return `https://www.binance.com/en/futures/${symbol}USDT`
      case 'bybit':
        return `https://www.bybit.com/trade/usdt/${symbol}USDT`
      case 'hyperliquid':
        return `https://app.hyperliquid.xyz/trade/${symbol}`
      case 'lighter':
        return `https://app.lighter.xyz/trade/${symbol}`
    }
  }

  const getBadgeVariant = (spread: number): 'success' | 'secondary' | 'outline' => {
    if (spread > 1) return 'success'
    if (spread > 0.5) return 'secondary'
    return 'outline'
  }

  const formatCountdown = (timestamp?: number) => {
    if (!timestamp) return '-'
    const now = Date.now()
    const diff = timestamp - now
    if (diff <= 0) return '0:00:00'

    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((diff % (1000 * 60)) / 1000)

    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  // Force component rerender every second for countdown updates
  const [, setNow] = useState(Date.now())
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-[1800px] mx-auto">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          {EXCHANGES.map((exchange) => (
            <Card key={exchange} className="bg-card/50">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: EXCHANGE_CONFIG[exchange].color }}
                  />
                  <span className="text-sm font-medium">{EXCHANGE_CONFIG[exchange].name}</span>
                </div>
                <div className="text-2xl font-bold mt-1">{stats[exchange] || 0}</div>
                <div className="text-xs text-muted-foreground">pairs</div>
              </CardContent>
            </Card>
          ))}
          <Card className="bg-card/50">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-3 h-3 text-primary" />
                <span className="text-sm font-medium">Opportunities</span>
              </div>
              <div className="text-2xl font-bold mt-1">{stats.totalSymbols || 0}</div>
              <div className="text-xs text-muted-foreground">symbols</div>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-xl border-border bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2 text-card-foreground">
                  <TrendingUp className="h-5 w-5" />
                  Funding Rate Matrix (Hourly Normalized)
                </CardTitle>
                <CardDescription>
                  {filteredSpreads.length} opportunities tracked
                  {lastUpdate && (
                    <span className="ml-2 text-xs">
                      • Updated: {new Date(lastUpdate).toLocaleTimeString()}
                    </span>
                  )}
                </CardDescription>
              </div>

              <div className="flex gap-2">
                <Input
                  placeholder="Search symbol..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-xs bg-secondary border-border text-foreground"
                />
                <button
                  onClick={fetchSpreads}
                  disabled={loading}
                  className="p-2 rounded-md hover:bg-accent transition-colors disabled:opacity-50"
                  title="Refresh data"
                >
                  <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {loading && spreads.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead className="sticky left-0 bg-card z-10">
                        <button
                          onClick={() => handleSort('symbol')}
                          className="flex items-center gap-1 hover:text-foreground"
                        >
                          Symbol
                          <ArrowUpDown className="h-4 w-4" />
                        </button>
                      </TableHead>
                      {EXCHANGES.map((exchange) => (
                        <TableHead key={exchange} className="text-center min-w-[100px]">
                          <div className="flex items-center justify-center gap-1">
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: EXCHANGE_CONFIG[exchange].color }}
                            />
                            {EXCHANGE_CONFIG[exchange].name}
                          </div>
                        </TableHead>
                      ))}
                      <TableHead className="text-center">Price Spread</TableHead>
                      <TableHead>
                        <button
                          onClick={() => handleSort('spread')}
                          className="flex items-center gap-1 hover:text-foreground"
                        >
                          Best Spread
                          <ArrowUpDown className="h-4 w-4" />
                        </button>
                      </TableHead>
                      <TableHead>Strategy</TableHead>
                      <TableHead>Annual APR</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSpreads.map((spread) => (
                      <TableRow
                        key={spread.symbol}
                        className="border-border hover:bg-accent/30 transition-colors cursor-pointer"
                        onClick={() => {
                          setSelectedSymbol(spread.symbol)
                          setAvailableExchanges(Object.keys(spread.exchanges) as ExchangeId[])
                          setSelectedExchange1(spread.bestSpread.longExchange)
                          setSelectedExchange2(spread.bestSpread.shortExchange)
                          setModalOpen(true)
                        }}
                      >
                        <TableCell className="sticky left-0 bg-card font-mono font-semibold text-foreground">
                          {spread.symbol}
                        </TableCell>
                        {EXCHANGES.map((exchange) => {
                          const rate = spread.exchanges[exchange]
                          const isLong = spread.bestSpread.longExchange === exchange
                          const isShort = spread.bestSpread.shortExchange === exchange

                          return (
                            <TableCell key={exchange} className="text-center">
                              {rate?.available ? (
                                <div className="flex flex-col items-center gap-1">
                                  <a
                                    href={getExchangeUrl(exchange, spread.symbol)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className={`inline-flex items-center gap-1 font-mono text-sm hover:underline ${getRateColor(
                                      rate.hourlyRate
                                    )} ${isLong ? 'bg-green-500/20 px-2 py-0.5 rounded' : ''} ${
                                      isShort ? 'bg-red-500/20 px-2 py-0.5 rounded' : ''
                                    }`}
                                    title={`${isLong ? 'LONG' : isShort ? 'SHORT' : ''} - Click to open`}
                                  >
                                    {formatRate(rate.hourlyRate)}
                                    <ExternalLink className="h-3 w-3 opacity-50" />
                                  </a>
                                  <div
                                    className={`text-xs font-mono ${
                                      isLong ? 'text-green-400' : isShort ? 'text-red-400' : 'text-muted-foreground'
                                    }`}
                                  >
                                    {formatCountdown(rate.nextFundingTime)}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                          )
                        })}
                        {/* Price Spread */}
                        <TableCell className="text-center">
                          {(() => {
                            const longRate = spread.exchanges[spread.bestSpread.longExchange]
                            const shortRate = spread.exchanges[spread.bestSpread.shortExchange]
                            if (longRate?.markPrice && shortRate?.markPrice) {
                              const priceSpread = ((longRate.markPrice - shortRate.markPrice) / shortRate.markPrice) * 100
                              return (
                                <span className={`font-mono text-xs ${priceSpread >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                  {priceSpread >= 0 ? '+' : ''}{priceSpread.toFixed(2)}%
                                </span>
                              )
                            }
                            return <span className="text-muted-foreground text-xs">-</span>
                          })()}
                        </TableCell>
                        <TableCell className={`font-mono font-semibold ${getSpreadColor(spread.bestSpread.spreadHourly)}`}>
                          {formatSpread(spread.bestSpread.spreadHourly)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-xs">
                            <span className="text-green-400 font-medium">
                              L:{EXCHANGE_CONFIG[spread.bestSpread.longExchange]?.name.substring(0, 3)}
                            </span>
                            <ArrowRight className="h-3 w-3 text-muted-foreground" />
                            <span className="text-red-400 font-medium">
                              S:{EXCHANGE_CONFIG[spread.bestSpread.shortExchange]?.name.substring(0, 3)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getBadgeVariant(spread.bestSpread.spreadAnnual)}>
                            {spread.bestSpread.spreadAnnual.toFixed(1)}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {filteredSpreads.length === 0 && !loading && (
                  <div className="text-center py-12 text-muted-foreground">
                    No spreads found. Try a different search term.
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          <p>
            All rates normalized to hourly • Data refreshes every 5 minutes
          </p>
          <p className="mt-1">
            <span className="text-green-400">Green highlight</span> = Long position •
            <span className="text-red-400 ml-2">Red highlight</span> = Short position
          </p>
        </div>

        <SpreadHistoryModal
          symbol={selectedSymbol}
          open={modalOpen}
          onOpenChange={setModalOpen}
          availableExchanges={availableExchanges}
          initialExchange1={selectedExchange1}
          initialExchange2={selectedExchange2}
        />
      </div>
    </div>
  )
}
