'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { Play, Pause, RotateCcw, TrendingUp, DollarSign, Percent, Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface SimulationParams {
  // Prices
  longPrice: number
  shortPrice: number

  // Positions
  longQuantity: number
  shortQuantity: number

  // Funding Rates (hourly %)
  longFundingRate: number
  shortFundingRate: number

  // Leverage
  longLeverage: number
  shortLeverage: number
}

interface SimulationPoint {
  time: number // hours
  longPrice: number
  shortPrice: number
  priceSpread: number
  fundingSpread: number
  pricePnL: number
  fundingPnL: number
  totalPnL: number
  roi: number
}

export default function SimulatorPage() {
  // Initial parameters
  const [params, setParams] = useState<SimulationParams>({
    longPrice: 100,
    shortPrice: 100,
    longQuantity: 1000,
    shortQuantity: 1000,
    longFundingRate: 0.01, // 0.01% per hour
    shortFundingRate: -0.01,
    longLeverage: 1,
    shortLeverage: 1,
  })

  // Simulation state
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [maxTime] = useState(168) // 1 week in hours
  const [history, setHistory] = useState<SimulationPoint[]>([])

  // Initial capital
  const initialCapital = useMemo(() => {
    return (params.longPrice * params.longQuantity) / params.longLeverage +
           (params.shortPrice * params.shortQuantity) / params.shortLeverage
  }, [params.longPrice, params.shortPrice, params.longQuantity, params.shortQuantity, params.longLeverage, params.shortLeverage])

  // Price spread
  const priceSpread = useMemo(() => {
    return ((params.longPrice - params.shortPrice) / params.shortPrice) * 100
  }, [params.longPrice, params.shortPrice])

  // Funding spread
  const fundingSpread = useMemo(() => {
    return params.longFundingRate - params.shortFundingRate
  }, [params.longFundingRate, params.shortFundingRate])

  // Calculate PnL at current prices
  const calculatePnL = (
    currentLongPrice: number,
    currentShortPrice: number,
    hours: number
  ) => {
    // Price PnL
    const longPricePnL = (currentLongPrice - params.longPrice) * params.longQuantity
    const shortPricePnL = (params.shortPrice - currentShortPrice) * params.shortQuantity
    const totalPricePnL = longPricePnL + shortPricePnL

    // Funding PnL (accumulated over time)
    // Long pays funding if positive, receives if negative
    // Short receives funding if positive, pays if negative
    const longFundingPnL = -params.longFundingRate * params.longPrice * params.longQuantity * hours
    const shortFundingPnL = params.shortFundingRate * params.shortPrice * params.shortQuantity * hours
    const totalFundingPnL = longFundingPnL + shortFundingPnL

    const totalPnL = totalPricePnL + totalFundingPnL
    const roi = (totalPnL / initialCapital) * 100

    return {
      pricePnL: totalPricePnL,
      fundingPnL: totalFundingPnL,
      totalPnL,
      roi,
    }
  }

  // Generate simulation history
  const generateHistory = () => {
    const points: SimulationPoint[] = []

    for (let t = 0; t <= maxTime; t++) {
      const pnl = calculatePnL(params.longPrice, params.shortPrice, t)

      points.push({
        time: t,
        longPrice: params.longPrice,
        shortPrice: params.shortPrice,
        priceSpread: priceSpread,
        fundingSpread: fundingSpread,
        pricePnL: pnl.pricePnL,
        fundingPnL: pnl.fundingPnL,
        totalPnL: pnl.totalPnL,
        roi: pnl.roi,
      })
    }

    setHistory(points)
  }

  // Update history when params change
  useEffect(() => {
    generateHistory()
  }, [params])

  // Play simulation
  useEffect(() => {
    if (isPlaying && currentTime < maxTime) {
      const timer = setTimeout(() => {
        setCurrentTime(t => t + 1)
      }, 100) // 100ms per hour
      return () => clearTimeout(timer)
    } else if (currentTime >= maxTime) {
      setIsPlaying(false)
    }
  }, [isPlaying, currentTime, maxTime])

  const currentPnL = useMemo(() => {
    return calculatePnL(params.longPrice, params.shortPrice, currentTime)
  }, [params, currentTime])

  const updateParam = <K extends keyof SimulationParams>(key: K, value: SimulationParams[K]) => {
    setParams(prev => ({ ...prev, [key]: value }))
  }

  // Update prices based on spread
  const updatePriceSpread = (spreadPercent: number) => {
    const newLongPrice = params.shortPrice * (1 + spreadPercent / 100)
    setParams(prev => ({ ...prev, longPrice: newLongPrice }))
  }

  // Update funding rates based on spread
  const updateFundingSpread = (spreadPercent: number) => {
    const avgRate = (params.longFundingRate + params.shortFundingRate) / 2
    setParams(prev => ({
      ...prev,
      longFundingRate: avgRate + spreadPercent / 2,
      shortFundingRate: avgRate - spreadPercent / 2,
    }))
  }

  const reset = () => {
    setCurrentTime(0)
    setIsPlaying(false)
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-[1800px] mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Funding Arbitrage Simulator
            </CardTitle>
            <CardDescription>
              Visualize PnL from funding rate arbitrage with dynamic price and funding rate changes
            </CardDescription>
          </CardHeader>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Controls */}
          <div className="space-y-6">
            {/* Price Controls */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Price Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-green-400">Long Exchange Price ($)</Label>
                  <Input
                    type="number"
                    value={params.longPrice}
                    onChange={(e) => updateParam('longPrice', parseFloat(e.target.value))}
                    step="0.01"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-red-400">Short Exchange Price ($)</Label>
                  <Input
                    type="number"
                    value={params.shortPrice}
                    onChange={(e) => updateParam('shortPrice', parseFloat(e.target.value))}
                    step="0.01"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Price Spread (%)</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Slider
                      value={[priceSpread]}
                      onValueChange={([v]) => updatePriceSpread(v)}
                      min={-10}
                      max={10}
                      step={0.1}
                      className="flex-1"
                    />
                    <Badge variant={priceSpread >= 0 ? 'default' : 'destructive'}>
                      {priceSpread >= 0 ? '+' : ''}{priceSpread.toFixed(2)}%
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Position Controls */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Position Sizes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-green-400">Long Quantity (tokens)</Label>
                  <Input
                    type="number"
                    value={params.longQuantity}
                    onChange={(e) => updateParam('longQuantity', parseFloat(e.target.value))}
                    step="100"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-red-400">Short Quantity (tokens)</Label>
                  <Input
                    type="number"
                    value={params.shortQuantity}
                    onChange={(e) => updateParam('shortQuantity', parseFloat(e.target.value))}
                    step="100"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-green-400">Long Leverage (x)</Label>
                  <Slider
                    value={[params.longLeverage]}
                    onValueChange={([v]) => updateParam('longLeverage', v)}
                    min={1}
                    max={20}
                    step={1}
                    className="mt-2"
                  />
                  <div className="text-right text-sm text-muted-foreground mt-1">{params.longLeverage}x</div>
                </div>
                <div>
                  <Label className="text-red-400">Short Leverage (x)</Label>
                  <Slider
                    value={[params.shortLeverage]}
                    onValueChange={([v]) => updateParam('shortLeverage', v)}
                    min={1}
                    max={20}
                    step={1}
                    className="mt-2"
                  />
                  <div className="text-right text-sm text-muted-foreground mt-1">{params.shortLeverage}x</div>
                </div>
              </CardContent>
            </Card>

            {/* Funding Controls */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Funding Rates (hourly %)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-green-400">Long Funding Rate (%/hour)</Label>
                  <Input
                    type="number"
                    value={params.longFundingRate}
                    onChange={(e) => updateParam('longFundingRate', parseFloat(e.target.value))}
                    step="0.001"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-red-400">Short Funding Rate (%/hour)</Label>
                  <Input
                    type="number"
                    value={params.shortFundingRate}
                    onChange={(e) => updateParam('shortFundingRate', parseFloat(e.target.value))}
                    step="0.001"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Funding Spread (%/hour)</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Slider
                      value={[fundingSpread]}
                      onValueChange={([v]) => updateFundingSpread(v)}
                      min={-0.1}
                      max={0.1}
                      step={0.001}
                      className="flex-1"
                    />
                    <Badge variant={fundingSpread >= 0 ? 'default' : 'destructive'}>
                      {fundingSpread >= 0 ? '+' : ''}{fundingSpread.toFixed(4)}%
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Simulation Controls */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Time Control</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => setIsPlaying(!isPlaying)}
                    variant={isPlaying ? 'destructive' : 'default'}
                    className="flex-1"
                  >
                    {isPlaying ? (
                      <>
                        <Pause className="h-4 w-4 mr-2" />
                        Pause
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        Play
                      </>
                    )}
                  </Button>
                  <Button onClick={reset} variant="outline">
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Time: {currentTime}h / {maxTime}h</span>
                    <span>{(currentTime / 24).toFixed(1)} days</span>
                  </div>
                  <Slider
                    value={[currentTime]}
                    onValueChange={([v]) => setCurrentTime(v)}
                    min={0}
                    max={maxTime}
                    step={1}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Charts and Metrics */}
          <div className="lg:col-span-2 space-y-6">
            {/* Current PnL Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <DollarSign className="h-4 w-4" />
                    Initial Capital
                  </div>
                  <div className="text-2xl font-bold mt-1">
                    ${initialCapital.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <TrendingUp className="h-4 w-4" />
                    Price PnL
                  </div>
                  <div className={`text-2xl font-bold mt-1 ${currentPnL.pricePnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    ${currentPnL.pricePnL.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <Clock className="h-4 w-4" />
                    Funding PnL
                  </div>
                  <div className={`text-2xl font-bold mt-1 ${currentPnL.fundingPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    ${currentPnL.fundingPnL.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <Percent className="h-4 w-4" />
                    Total ROI
                  </div>
                  <div className={`text-2xl font-bold mt-1 ${currentPnL.roi >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {currentPnL.roi >= 0 ? '+' : ''}{currentPnL.roi.toFixed(2)}%
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Price Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Price Movement</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={history.slice(0, currentTime + 1)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="time"
                      stroke="hsl(var(--muted-foreground))"
                      label={{ value: 'Time (hours)', position: 'insideBottom', offset: -5 }}
                    />
                    <YAxis
                      stroke="hsl(var(--muted-foreground))"
                      label={{ value: 'Price ($)', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="longPrice"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={false}
                      name="Long Price"
                    />
                    <Line
                      type="monotone"
                      dataKey="shortPrice"
                      stroke="#ef4444"
                      strokeWidth={2}
                      dot={false}
                      name="Short Price"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* PnL Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">PnL Accumulation</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={history.slice(0, currentTime + 1)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="time"
                      stroke="hsl(var(--muted-foreground))"
                      label={{ value: 'Time (hours)', position: 'insideBottom', offset: -5 }}
                    />
                    <YAxis
                      stroke="hsl(var(--muted-foreground))"
                      label={{ value: 'PnL ($)', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                      }}
                    />
                    <ReferenceLine y={0} stroke="hsl(var(--border))" strokeDasharray="3 3" />
                    <Area
                      type="monotone"
                      dataKey="fundingPnL"
                      stackId="1"
                      stroke="#3b82f6"
                      fill="#3b82f620"
                      name="Funding PnL"
                    />
                    <Area
                      type="monotone"
                      dataKey="pricePnL"
                      stackId="1"
                      stroke="#a855f7"
                      fill="#a855f720"
                      name="Price PnL"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
