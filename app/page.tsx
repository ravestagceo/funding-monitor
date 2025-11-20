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
import { ArrowUpDown, RefreshCw, TrendingDown, TrendingUp } from 'lucide-react'

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
          aValue = Math.abs(a.spreadPercent)
          bValue = Math.abs(b.spreadPercent)
          break
        case 'binance':
          aValue = a.binanceRate
          bValue = b.binanceRate
          break
        case 'lighter':
          aValue = a.lighterRate
          bValue = b.lighterRate
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

  const getSpreadColor = (spread: number) => {
    const absSpread = Math.abs(spread)
    if (absSpread > 0.05) return 'text-red-600 font-bold'
    if (absSpread > 0.02) return 'text-orange-600 font-semibold'
    if (absSpread > 0.01) return 'text-yellow-600'
    return 'text-gray-600'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Funding Rate Monitor
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Real-time funding rate spread tracking between Binance and Lighter DEX
          </p>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Funding Spreads
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
                  className="max-w-xs"
                />
                <button
                  onClick={fetchSpreads}
                  disabled={loading}
                  className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
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
                <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <button
                          onClick={() => handleSort('symbol')}
                          className="flex items-center gap-1 hover:text-gray-900 dark:hover:text-gray-100"
                        >
                          Symbol
                          <ArrowUpDown className="h-4 w-4" />
                        </button>
                      </TableHead>
                      <TableHead>
                        <button
                          onClick={() => handleSort('binance')}
                          className="flex items-center gap-1 hover:text-gray-900 dark:hover:text-gray-100"
                        >
                          Binance Rate
                          <ArrowUpDown className="h-4 w-4" />
                        </button>
                      </TableHead>
                      <TableHead>
                        <button
                          onClick={() => handleSort('lighter')}
                          className="flex items-center gap-1 hover:text-gray-900 dark:hover:text-gray-100"
                        >
                          Lighter Rate
                          <ArrowUpDown className="h-4 w-4" />
                        </button>
                      </TableHead>
                      <TableHead>
                        <button
                          onClick={() => handleSort('spread')}
                          className="flex items-center gap-1 hover:text-gray-900 dark:hover:text-gray-100"
                        >
                          Spread
                          <ArrowUpDown className="h-4 w-4" />
                        </button>
                      </TableHead>
                      <TableHead>Annual APR</TableHead>
                      <TableHead className="text-right">Mark Price</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSpreads.map((spread) => (
                      <TableRow key={spread.symbol} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                        <TableCell className="font-mono font-semibold">
                          {spread.symbol}
                        </TableCell>
                        <TableCell className="font-mono">
                          <div className="flex items-center gap-2">
                            {formatRate(spread.binanceRate)}
                            {spread.binanceRate > 0 ? (
                              <TrendingUp className="h-3 w-3 text-green-500" />
                            ) : (
                              <TrendingDown className="h-3 w-3 text-red-500" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono">
                          <div className="flex items-center gap-2">
                            {formatRate(spread.lighterRate)}
                            {spread.lighterRate > 0 ? (
                              <TrendingUp className="h-3 w-3 text-green-500" />
                            ) : (
                              <TrendingDown className="h-3 w-3 text-red-500" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell className={`font-mono ${getSpreadColor(spread.spreadPercent)}`}>
                          {formatSpread(spread.spreadPercent)}
                        </TableCell>
                        <TableCell>
                          {spread.annualizedSpread !== undefined && (
                            <Badge
                              variant={
                                Math.abs(spread.annualizedSpread) > 50
                                  ? 'destructive'
                                  : Math.abs(spread.annualizedSpread) > 20
                                  ? 'warning'
                                  : 'secondary'
                              }
                            >
                              {formatSpread(spread.annualizedSpread)}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm text-gray-600 dark:text-gray-400">
                          {spread.binanceMarkPrice
                            ? `$${spread.binanceMarkPrice.toLocaleString(undefined, {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 8,
                              })}`
                            : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {filteredSpreads.length === 0 && !loading && (
                  <div className="text-center py-12 text-gray-500">
                    No spreads found. Try a different search term.
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>
            Data refreshes every 5 minutes • Spread = (Binance Rate - Lighter Rate) × 100%
          </p>
          <p className="mt-1">
            Annual APR assumes 3 funding periods per day (every 8 hours)
          </p>
        </div>
      </div>
    </div>
  )
}
