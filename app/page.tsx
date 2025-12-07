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
import { SpreadHistoryModal } from '@/components/spread-history-modal'
import type { MultiExchangeSpread, ExchangeId } from '@/lib/types'
import { EXCHANGE_CONFIG } from '@/lib/types'
import { getExchangeUrl } from '@/lib/exchanges'
import { ArrowUpDown, RefreshCw, TrendingUp, Clock, ExternalLink, Activity } from 'lucide-react'

export default function Home() {
  const [spreads, setSpreads] = useState<MultiExchangeSpread[]>([])
  const [filteredSpreads, setFilteredSpreads] = useState<MultiExchangeSpread[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<'symbol' | 'spread'>('spread')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [lastUpdate, setLastUpdate] = useState<string>('')
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
          // Spread is always positive now, both modes sort the same way
          aValue = a.bestSpread.spreadHourly
          bValue = b.bestSpread.spreadHourly
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

  // Force component rerender every second for countdown updates
  const [, setNow] = useState(Date.now())
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [])

  const getRateColor = (rate: number) => {
    if (rate > 0.0001) return 'text-green-400'
    if (rate < -0.0001) return 'text-red-400'
    return 'text-muted-foreground'
  }

  const getSpreadColor = (spread: number) => {
    // Spread is always positive (shortRate - longRate)
    // Higher spread = more profitable
    if (spread > 0.05) return 'text-green-400 font-bold'
    if (spread > 0.02) return 'text-emerald-400 font-semibold'
    if (spread > 0.01) return 'text-teal-400'
    if (spread > 0.005) return 'text-yellow-400'
    if (spread > 0) return 'text-gray-400'
    return 'text-red-400' // Should not happen with correct logic
  }

  const getTokenIcon = (symbol: string) => {
    const baseSymbol = symbol.replace('USDT', '').replace('1000', '')
    // Try multiple CDN sources
    return `https://cryptologos.cc/logos/${baseSymbol.toLowerCase()}-${baseSymbol.toLowerCase()}-logo.png`
  }

  const handleIconError = (e: React.SyntheticEvent<HTMLImageElement>, symbol: string) => {
    const img = e.currentTarget
    const baseSymbol = symbol.replace('USDT', '').replace('1000', '')

    // Try fallback sources in order
    if (!img.dataset.fallback) {
      img.dataset.fallback = '1'
      img.src = `https://assets.coincap.io/assets/icons/${baseSymbol.toLowerCase()}@2x.png`
    } else if (img.dataset.fallback === '1') {
      img.dataset.fallback = '2'
      img.src = `https://s2.coinmarketcap.com/static/img/coins/64x64/${baseSymbol.toLowerCase()}.png`
    } else {
      // Show placeholder with first letter
      img.style.display = 'none'
      const parent = img.parentElement
      if (parent && !parent.querySelector('.token-placeholder')) {
        const placeholder = document.createElement('div')
        placeholder.className = 'token-placeholder w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary'
        placeholder.textContent = baseSymbol.charAt(0)
        parent.insertBefore(placeholder, img)
      }
    }
  }

  const getBadgeVariant = (spread: number): 'success' | 'secondary' | 'outline' => {
    const absSpread = Math.abs(spread)
    if (absSpread > 1) return 'success'
    if (absSpread > 0.5) return 'secondary'
    return 'outline'
  }

  const getStabilityBadge = (spreadHourly: number) => {
    // Higher positive spread = more profitable
    if (spreadHourly > 0.05) return { variant: 'success' as const, label: 'High', tooltip: 'Strong profitable spread' }
    if (spreadHourly > 0.02) return { variant: 'secondary' as const, label: 'Med', tooltip: 'Moderate profitable spread' }
    if (spreadHourly > 0.01) return { variant: 'outline' as const, label: 'Low', tooltip: 'Minimal profitable spread' }
    return { variant: 'destructive' as const, label: 'Very Low', tooltip: 'Very low spread - barely profitable' }
  }

  const handleRowClick = (spread: MultiExchangeSpread) => {
    setSelectedSymbol(spread.symbol)
    setAvailableExchanges(Object.keys(spread.exchanges) as ExchangeId[])
    setSelectedExchange1(spread.bestSpread.longExchange)
    setSelectedExchange2(spread.bestSpread.shortExchange)
    setModalOpen(true)
  }

  return (
    <>
      <SpreadHistoryModal
        symbol={selectedSymbol}
        open={modalOpen}
        onOpenChange={setModalOpen}
        availableExchanges={availableExchanges}
        initialExchange1={selectedExchange1}
        initialExchange2={selectedExchange2}
      />
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-[1600px] mx-auto">

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
                      <TableHead colSpan={2}>
                        <div className="text-green-400 font-semibold">Long Exchange</div>
                      </TableHead>
                      <TableHead colSpan={2}>
                        <div className="text-red-400 font-semibold">Short Exchange</div>
                      </TableHead>
                      <TableHead>
                        <div className="font-semibold">Price Spread</div>
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
                      <TableHead>
                        <div className="flex items-center gap-1">
                          <Activity className="h-4 w-4" />
                          Stability
                        </div>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSpreads.map((spread) => {
                      const stability = getStabilityBadge(spread.bestSpread.spreadHourly)
                      const longExchange = spread.bestSpread.longExchange
                      const shortExchange = spread.bestSpread.shortExchange
                      const longRate = spread.exchanges[longExchange]
                      const shortRate = spread.exchanges[shortExchange]

                      return (
                      <TableRow
                        key={spread.symbol}
                        className="border-border hover:bg-accent/30 transition-colors cursor-pointer"
                        onClick={() => handleRowClick(spread)}
                      >
                        <TableCell className="font-mono font-semibold text-foreground">
                          <div className="flex items-center gap-2">
                            <img
                              src={getTokenIcon(spread.symbol)}
                              alt={spread.symbol}
                              className="w-6 h-6 rounded-full object-cover"
                              onError={(e) => handleIconError(e, spread.symbol)}
                            />
                            <span>{spread.symbol}</span>
                          </div>
                        </TableCell>

                        {/* Long Exchange Rate */}
                        <TableCell colSpan={2}>
                          <div className="flex flex-col gap-0.5">
                            <div className="text-xs text-muted-foreground font-semibold">{EXCHANGE_CONFIG[longExchange].name}</div>
                            <div className="font-mono text-xs text-muted-foreground">
                              {longRate?.markPrice
                                ? `$${longRate.markPrice.toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 6,
                                  })}`
                                : '-'}
                            </div>
                            <a
                              href={getExchangeUrl(longExchange, spread.symbol)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 hover:underline w-fit"
                              title={`LONG on ${EXCHANGE_CONFIG[longExchange].name}`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <span className="font-mono text-xs text-green-400 font-semibold">{formatRate(longRate?.hourlyRate || 0)}</span>
                              <ExternalLink className="h-3 w-3 opacity-50" />
                            </a>
                            <div className="font-mono text-xs text-green-400/70">
                              {formatCountdown(longRate?.nextFundingTime)}
                            </div>
                          </div>
                        </TableCell>

                        {/* Short Exchange Rate */}
                        <TableCell colSpan={2}>
                          <div className="flex flex-col gap-0.5">
                            <div className="text-xs text-muted-foreground font-semibold">{EXCHANGE_CONFIG[shortExchange].name}</div>
                            <div className="font-mono text-xs text-muted-foreground">
                              {shortRate?.markPrice
                                ? `$${shortRate.markPrice.toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 6,
                                  })}`
                                : '-'}
                            </div>
                            <a
                              href={getExchangeUrl(shortExchange, spread.symbol)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 hover:underline w-fit"
                              title={`SHORT on ${EXCHANGE_CONFIG[shortExchange].name}`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <span className="font-mono text-xs text-red-400 font-semibold">{formatRate(shortRate?.hourlyRate || 0)}</span>
                              <ExternalLink className="h-3 w-3 opacity-50" />
                            </a>
                            <div className="font-mono text-xs text-red-400/70">
                              {formatCountdown(shortRate?.nextFundingTime)}
                            </div>
                          </div>
                        </TableCell>

                        {/* Price Spread */}
                        <TableCell>
                          {longRate?.markPrice && shortRate?.markPrice ? (
                            <div className="font-mono text-xs">
                              {(() => {
                                const priceSpread = ((longRate.markPrice - shortRate.markPrice) / shortRate.markPrice) * 100
                                return (
                                  <span className={priceSpread >= 0 ? 'text-green-400' : 'text-red-400'}>
                                    {priceSpread >= 0 ? '+' : ''}{priceSpread.toFixed(2)}%
                                  </span>
                                )
                              })()}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>

                        <TableCell className={`font-mono font-semibold ${getSpreadColor(spread.bestSpread.spreadHourly)}`}>
                          {formatSpread(spread.bestSpread.spreadHourly)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getBadgeVariant(spread.bestSpread.spreadDaily)}>
                            {formatSpread(spread.bestSpread.spreadDaily)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getBadgeVariant(spread.bestSpread.spreadAnnual)}>
                            {formatSpread(spread.bestSpread.spreadAnnual)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={stability.variant} title={stability.tooltip}>
                            {stability.label}
                          </Badge>
                        </TableCell>
                      </TableRow>
                      )
                    })}
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
            Spread = |Long hourly - Short hourly| × 100% • Click row for detailed history
          </p>
          <p className="mt-1 text-xs">
            <span className="text-green-400">Green</span> = Long position • <span className="text-red-400">Red</span> = Short position
          </p>
        </div>
      </div>
    </div>
    </>
  )
}
