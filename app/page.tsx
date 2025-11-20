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
import { ArrowUpDown, RefreshCw, TrendingUp, Clock } from 'lucide-react'

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

        <Card className="shadow-lg border-border">
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
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border hover:bg-muted/50">
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
                      <TableRow key={spread.symbol} className="border-border hover:bg-muted/50">
                        <TableCell className="font-mono font-semibold text-foreground">
                          {spread.symbol}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {formatRate(spread.binanceHourlyRate)}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {formatRate(spread.lighterHourlyRate)}
                        </TableCell>
                        <TableCell className={`font-mono font-semibold ${getSpreadColor(spread.spreadHourly)}`}>
                          {formatSpread(spread.spreadHourly)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              Math.abs(spread.spreadDaily) > 1
                                ? 'success'
                                : Math.abs(spread.spreadDaily) > 0.5
                                ? 'secondary'
                                : 'outline'
                            }
                          >
                            {formatSpread(spread.spreadDaily)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              Math.abs(spread.spreadAnnual) > 365
                                ? 'success'
                                : Math.abs(spread.spreadAnnual) > 180
                                ? 'secondary'
                                : 'outline'
                            }
                          >
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
            Spread = (Binance hourly - Lighter hourly) × 100%
          </p>
        </div>
      </div>
    </div>
  )
}
