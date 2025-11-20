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
import type { FundingSpread } from '@/lib/types'
import { ArrowUpDown, RefreshCw, TrendingUp, Clock, ExternalLink } from 'lucide-react'

export default function Home() {
  const [spreads, setSpreads] = useState<FundingSpread[]>([])
  const [filteredSpreads, setFilteredSpreads] = useState<FundingSpread[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<'symbol' | 'spread' | 'binance' | 'lighter'>('spread')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [lastUpdate, setLastUpdate] = useState<string>('')

  const fetchSpreads = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/funding/spreads')
      const result = await response.json()

      if (result.success) {
        setSpreads(result.data)
        setFilteredSpreads(result.data)
        setLastUpdate(result.timestamp)
      }
    } catch (error) {
      console.error('Error fetching spreads:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSpreads()

    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchSpreads, 5 * 60 * 1000)

    return () => clearInterval(interval)
  }, [])

  // Filter spreads based on search term
  useEffect(() => {
    const filtered = spreads.filter((spread) =>
      spread.symbol.toLowerCase().includes(searchTerm.toLowerCase())
    )
    setFilteredSpreads(filtered)
  }, [searchTerm, spreads])

  // Sort spreads
  useEffect(() => {
    const sorted = [...filteredSpreads].sort((a, b) => {
      let aValue: number | string = 0
      let bValue: number | string = 0

      switch (sortBy) {
        case 'symbol':
          aValue = a.symbol
          bValue = b.symbol
          break
        case 'spread':
          aValue = Math.abs(a.spreadHourly)
          bValue = Math.abs(b.spreadHourly)
          break
        case 'binance':
          aValue = a.binanceHourlyRate
          bValue = b.binanceHourlyRate
          break
        case 'lighter':
          aValue = a.lighterHourlyRate
          bValue = b.lighterHourlyRate
          break
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortOrder === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue)
      }

      return sortOrder === 'asc' ? (aValue as number) - (bValue as number) : (bValue as number) - (aValue as number)
    })

    setFilteredSpreads(sorted)
  }, [sortBy, sortOrder])

  const handleSort = (column: 'symbol' | 'spread' | 'binance' | 'lighter') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(column)
      setSortOrder('desc')
    }
  }

  const getBinanceUrl = (symbol: string) => {
    // Convert symbol format: BTC -> BTCUSDT
    let binanceSymbol = symbol
    if (!symbol.includes('USDT')) {
      binanceSymbol = `${symbol}USDT`
    }
    return `https://www.binance.com/en/futures/${binanceSymbol}`
  }

  const getLighterUrl = (symbol: string) => {
    return `https://app.lighter.xyz/trade/${symbol}`
  }

  const formatRate = (rate: number) => {
    return (rate * 100).toFixed(4) + '%'
  }

  const formatSpread = (spread: number) => {
    const formatted = spread.toFixed(4)
    return spread >= 0 ? `+${formatted}%` : `${formatted}%`
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

  const getSpreadColor = (spread: number) => {
    const absSpread = Math.abs(spread)
    if (absSpread > 0.05) return 'text-green-400 font-bold'
    if (absSpread > 0.02) return 'text-emerald-400 font-semibold'
    if (absSpread > 0.01) return 'text-teal-400'
    return 'text-gray-400'
  }

  const getTokenIcon = (symbol: string) => {
    // Use CoinGecko-style API for token icons
    const baseSymbol = symbol.replace('USDT', '').replace('1000', '')
    // Fallback to a simple placeholder or use a CDN
    return `https://assets.coincap.io/assets/icons/${baseSymbol.toLowerCase()}@2x.png`
  }

  const getBadgeVariant = (spread: number): 'success' | 'secondary' | 'outline' => {
    const absSpread = Math.abs(spread)
    if (absSpread > 1) return 'success'
    if (absSpread > 0.5) return 'secondary'
    return 'outline'
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-[1600px] mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 text-primary">
            Funding Rate Monitor
          </h1>
          <p className="text-muted-foreground">
            Real-time funding rate spread tracking between Binance and Lighter DEX
          </p>
        </div>

        <Card className="shadow-xl border-border bg-card/50 backdrop-blur-sm">
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2 text-card-foreground">
                  <TrendingUp className="h-5 w-5" />
                  Funding Spreads (Hourly Normalized)
                </CardTitle>
                <CardDescription>
                  {filteredSpreads.length} pairs tracked
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
                      <TableHead>
                        <button
                          onClick={() => handleSort('symbol')}
                          className="flex items-center gap-1 hover:text-foreground"
                        >
                          Symbol
                          <ArrowUpDown className="h-4 w-4" />
                        </button>
                      </TableHead>
                      <TableHead>
                        <button
                          onClick={() => handleSort('binance')}
                          className="flex items-center gap-1 hover:text-foreground"
                        >
                          Binance (hourly)
                          <ArrowUpDown className="h-4 w-4" />
                        </button>
                      </TableHead>
                      <TableHead>
                        <button
                          onClick={() => handleSort('lighter')}
                          className="flex items-center gap-1 hover:text-foreground"
                        >
                          Lighter (hourly)
                          <ArrowUpDown className="h-4 w-4" />
                        </button>
                      </TableHead>
                      <TableHead>
                        <button
                          onClick={() => handleSort('spread')}
                          className="flex items-center gap-1 hover:text-foreground"
                        >
                          Spread/hour
                          <ArrowUpDown className="h-4 w-4" />
                        </button>
                      </TableHead>
                      <TableHead>Daily APR</TableHead>
                      <TableHead>Annual APR</TableHead>
                      <TableHead className="text-right">Mark Price</TableHead>
                      <TableHead className="text-right">
                        <Clock className="h-4 w-4 inline mr-1" />
                        Next Funding
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSpreads.map((spread) => (
                      <TableRow key={spread.symbol} className="border-border hover:bg-accent/30 transition-colors">
                        <TableCell className="font-mono font-semibold text-foreground">
                          <div className="flex items-center gap-2">
                            <img
                              src={getTokenIcon(spread.symbol)}
                              alt={spread.symbol}
                              className="w-6 h-6 rounded-full"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none'
                              }}
                            />
                            <span>{spread.symbol}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          <a
                            href={getBinanceUrl(spread.symbol)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-foreground hover:text-primary transition-all duration-200 cursor-pointer group"
                            title="Open on Binance"
                          >
                            <span className="group-hover:underline">{formatRate(spread.binanceHourlyRate)}</span>
                            <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                          </a>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          <a
                            href={getLighterUrl(spread.symbol)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-foreground hover:text-primary transition-all duration-200 cursor-pointer group"
                            title="Open on Lighter"
                          >
                            <span className="group-hover:underline">{formatRate(spread.lighterHourlyRate)}</span>
                            <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                          </a>
                        </TableCell>
                        <TableCell className={`font-mono font-semibold ${getSpreadColor(spread.spreadHourly)}`}>
                          {formatSpread(spread.spreadHourly)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getBadgeVariant(spread.spreadDaily)}>
                            {formatSpread(spread.spreadDaily)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getBadgeVariant(spread.spreadAnnual)}>
                            {formatSpread(spread.spreadAnnual)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm text-muted-foreground">
                          {spread.binanceMarkPrice
                            ? `$${spread.binanceMarkPrice.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 8,
                              })}`
                            : '-'}
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs text-muted-foreground">
                          {formatCountdown(spread.binanceNextFunding)}
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
            Spread = (Binance hourly - Lighter hourly) × 100% • Click rates to open on exchange
          </p>
        </div>
      </div>
    </div>
  )
}
