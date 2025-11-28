'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { TrendingUp, TrendingDown, DollarSign, Percent, Clock, Info, RotateCcw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface PositionParams {
  // Entry prices
  entryLongPrice: number
  entryShortPrice: number

  // Current prices
  currentLongPrice: number
  currentShortPrice: number

  // Positions
  longQuantity: number
  shortQuantity: number

  // Funding Rates (hourly %)
  longFundingRate: number
  shortFundingRate: number

  // Leverage
  longLeverage: number
  shortLeverage: number

  // Time period (hours)
  holdingPeriod: number
}

export default function SimulatorPage() {
  const [params, setParams] = useState<PositionParams>({
    entryLongPrice: 100,
    entryShortPrice: 100,
    currentLongPrice: 100,
    currentShortPrice: 100,
    longQuantity: 1000,
    shortQuantity: 1000,
    longFundingRate: 0.01, // 0.01% per hour
    shortFundingRate: -0.01,
    longLeverage: 3,
    shortLeverage: 3,
    holdingPeriod: 168, // 1 week
  })

  // Initial capital required
  const initialCapital = useMemo(() => {
    return (params.entryLongPrice * params.longQuantity) / params.longLeverage +
           (params.entryShortPrice * params.shortQuantity) / params.shortLeverage
  }, [params.entryLongPrice, params.entryShortPrice, params.longQuantity, params.longLeverage, params.shortLeverage])

  // Price PnL breakdown
  const pricePnL = useMemo(() => {
    const longPnL = (params.currentLongPrice - params.entryLongPrice) * params.longQuantity
    const shortPnL = (params.entryShortPrice - params.currentShortPrice) * params.shortQuantity
    const total = longPnL + shortPnL

    return { longPnL, shortPnL, total }
  }, [params])

  // Funding PnL breakdown
  const fundingPnL = useMemo(() => {
    const longNotional = params.entryLongPrice * params.longQuantity
    const shortNotional = params.entryShortPrice * params.shortQuantity

    // Long pays if positive, receives if negative
    const longPnL = -(params.longFundingRate / 100) * longNotional * params.holdingPeriod
    // Short receives if positive, pays if negative
    const shortPnL = (params.shortFundingRate / 100) * shortNotional * params.holdingPeriod
    const total = longPnL + shortPnL

    return { longPnL, shortPnL, total }
  }, [params])

  // Total PnL and metrics
  const metrics = useMemo(() => {
    const totalPnL = pricePnL.total + fundingPnL.total
    const roi = (totalPnL / initialCapital) * 100
    const priceSpread = ((params.currentLongPrice - params.currentShortPrice) / params.currentShortPrice) * 100
    const fundingSpread = params.longFundingRate - params.shortFundingRate

    return { totalPnL, roi, priceSpread, fundingSpread }
  }, [pricePnL, fundingPnL, initialCapital, params])

  const updateParam = <K extends keyof PositionParams>(key: K, value: PositionParams[K]) => {
    setParams(prev => ({ ...prev, [key]: value }))
  }

  const resetToEntry = () => {
    setParams(prev => ({
      ...prev,
      currentLongPrice: prev.entryLongPrice,
      currentShortPrice: prev.entryShortPrice,
    }))
  }

  const loadPreset = (preset: 'balanced' | 'bullish' | 'bearish') => {
    switch (preset) {
      case 'balanced':
        setParams({
          entryLongPrice: 100,
          entryShortPrice: 100,
          currentLongPrice: 100,
          currentShortPrice: 100,
          longQuantity: 1000,
          shortQuantity: 1000,
          longFundingRate: 0.01,
          shortFundingRate: -0.01,
          longLeverage: 3,
          shortLeverage: 3,
          holdingPeriod: 168,
        })
        break
      case 'bullish':
        setParams({
          entryLongPrice: 100,
          entryShortPrice: 100,
          currentLongPrice: 105,
          currentShortPrice: 103,
          longQuantity: 1000,
          shortQuantity: 1000,
          longFundingRate: 0.015,
          shortFundingRate: -0.01,
          longLeverage: 3,
          shortLeverage: 3,
          holdingPeriod: 168,
        })
        break
      case 'bearish':
        setParams({
          entryLongPrice: 100,
          entryShortPrice: 100,
          currentLongPrice: 95,
          currentShortPrice: 97,
          longQuantity: 1000,
          shortQuantity: 1000,
          longFundingRate: -0.005,
          shortFundingRate: -0.015,
          longLeverage: 3,
          shortLeverage: 3,
          holdingPeriod: 168,
        })
        break
    }
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-[1600px] mx-auto space-y-6">
        {/* Header with Instructions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Калькулятор PnL для Фандинг Арбитража
            </CardTitle>
            <CardDescription className="space-y-2 mt-2">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Как пользоваться:</p>
                  <ol className="list-decimal list-inside space-y-1 text-sm mt-1">
                    <li>Задайте цены входа (Entry) и размеры позиций</li>
                    <li>Двигайте текущие цены (Current) чтобы симулировать движение рынка</li>
                    <li>Установите фандинг ставки и период удержания позиции</li>
                    <li>Смотрите детальный расчёт PnL справа: от изменения цены + от фандинга</li>
                  </ol>
                </div>
              </div>
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Presets */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Быстрые Сценарии</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button onClick={() => loadPreset('balanced')} variant="outline" size="sm">
              Нейтральный Рынок
            </Button>
            <Button onClick={() => loadPreset('bullish')} variant="outline" size="sm">
              Бычий Рынок (+5%)
            </Button>
            <Button onClick={() => loadPreset('bearish')} variant="outline" size="sm">
              Медвежий Рынок (-5%)
            </Button>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Input Parameters */}
          <div className="space-y-6">
            {/* Entry Prices */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">1. Цены Входа в Позицию</CardTitle>
                <CardDescription>По каким ценам вы открыли позицию</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-green-400">Long Exchange ($)</Label>
                    <Input
                      type="number"
                      value={params.entryLongPrice}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value)
                        updateParam('entryLongPrice', val)
                        updateParam('currentLongPrice', val)
                      }}
                      step="0.01"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-red-400">Short Exchange ($)</Label>
                    <Input
                      type="number"
                      value={params.entryShortPrice}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value)
                        updateParam('entryShortPrice', val)
                        updateParam('currentShortPrice', val)
                      }}
                      step="0.01"
                      className="mt-1"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Current Prices */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">2. Текущие Цены</CardTitle>
                    <CardDescription>Двигайте чтобы симулировать движение рынка</CardDescription>
                  </div>
                  <Button onClick={resetToEntry} variant="ghost" size="sm">
                    <RotateCcw className="h-4 w-4 mr-1" />
                    Сброс
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-green-400">Long Exchange ($)</Label>
                    <Input
                      type="number"
                      value={params.currentLongPrice}
                      onChange={(e) => updateParam('currentLongPrice', parseFloat(e.target.value))}
                      step="0.1"
                      className="mt-1"
                    />
                    <div className="text-xs text-muted-foreground mt-1">
                      {params.currentLongPrice > params.entryLongPrice ? '↑' : '↓'} {((params.currentLongPrice - params.entryLongPrice) / params.entryLongPrice * 100).toFixed(2)}%
                    </div>
                  </div>
                  <div>
                    <Label className="text-red-400">Short Exchange ($)</Label>
                    <Input
                      type="number"
                      value={params.currentShortPrice}
                      onChange={(e) => updateParam('currentShortPrice', parseFloat(e.target.value))}
                      step="0.1"
                      className="mt-1"
                    />
                    <div className="text-xs text-muted-foreground mt-1">
                      {params.currentShortPrice > params.entryShortPrice ? '↑' : '↓'} {((params.currentShortPrice - params.entryShortPrice) / params.entryShortPrice * 100).toFixed(2)}%
                    </div>
                  </div>
                </div>
                <div className="pt-2 border-t">
                  <div className="text-sm text-muted-foreground">Price Spread</div>
                  <div className="text-2xl font-mono font-bold">
                    {metrics.priceSpread >= 0 ? '+' : ''}{metrics.priceSpread.toFixed(3)}%
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Position Sizes */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">3. Размеры Позиций</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
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
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-green-400">Long Leverage</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Slider
                        value={[params.longLeverage]}
                        onValueChange={([v]) => updateParam('longLeverage', v)}
                        min={1}
                        max={20}
                        step={1}
                        className="flex-1"
                      />
                      <span className="text-sm font-mono w-8">{params.longLeverage}x</span>
                    </div>
                  </div>
                  <div>
                    <Label className="text-red-400">Short Leverage</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Slider
                        value={[params.shortLeverage]}
                        onValueChange={([v]) => updateParam('shortLeverage', v)}
                        min={1}
                        max={20}
                        step={1}
                        className="flex-1"
                      />
                      <span className="text-sm font-mono w-8">{params.shortLeverage}x</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Funding Rates */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">4. Фандинг Ставки</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-green-400">Long Rate (%/hour)</Label>
                    <Input
                      type="number"
                      value={params.longFundingRate}
                      onChange={(e) => updateParam('longFundingRate', parseFloat(e.target.value))}
                      step="0.001"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-red-400">Short Rate (%/hour)</Label>
                    <Input
                      type="number"
                      value={params.shortFundingRate}
                      onChange={(e) => updateParam('shortFundingRate', parseFloat(e.target.value))}
                      step="0.001"
                      className="mt-1"
                    />
                  </div>
                </div>
                <div>
                  <Label>Период Удержания (часов)</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Slider
                      value={[params.holdingPeriod]}
                      onValueChange={([v]) => updateParam('holdingPeriod', v)}
                      min={1}
                      max={720}
                      step={1}
                      className="flex-1"
                    />
                    <span className="text-sm font-mono w-20">{params.holdingPeriod}h ({(params.holdingPeriod / 24).toFixed(1)}d)</span>
                  </div>
                </div>
                <div className="pt-2 border-t">
                  <div className="text-sm text-muted-foreground">Funding Spread</div>
                  <div className="text-2xl font-mono font-bold">
                    {metrics.fundingSpread >= 0 ? '+' : ''}{metrics.fundingSpread.toFixed(4)}%/h
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Results */}
          <div className="space-y-6">
            {/* Summary Metrics */}
            <div className="grid grid-cols-2 gap-4">
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
                    <Percent className="h-4 w-4" />
                    Total ROI
                  </div>
                  <div className={`text-2xl font-bold mt-1 ${metrics.roi >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {metrics.roi >= 0 ? '+' : ''}{metrics.roi.toFixed(2)}%
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Price PnL Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Price PnL (от изменения цены)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-green-400">Long Position</span>
                    <span className={`font-mono font-bold ${pricePnL.longPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {pricePnL.longPnL >= 0 ? '+' : ''}${pricePnL.longPnL.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground pl-4">
                    ({params.currentLongPrice.toFixed(2)} - {params.entryLongPrice.toFixed(2)}) × {params.longQuantity}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-red-400">Short Position</span>
                    <span className={`font-mono font-bold ${pricePnL.shortPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {pricePnL.shortPnL >= 0 ? '+' : ''}${pricePnL.shortPnL.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground pl-4">
                    ({params.entryShortPrice.toFixed(2)} - {params.currentShortPrice.toFixed(2)}) × {params.shortQuantity}
                  </div>
                </div>

                <div className="pt-3 border-t flex justify-between items-center">
                  <span className="font-semibold">Total Price PnL</span>
                  <span className={`font-mono font-bold text-xl ${pricePnL.total >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {pricePnL.total >= 0 ? '+' : ''}${pricePnL.total.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Funding PnL Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Funding PnL (за {params.holdingPeriod}ч)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-green-400">Long Position {params.longFundingRate >= 0 ? '(платим)' : '(получаем)'}</span>
                    <span className={`font-mono font-bold ${fundingPnL.longPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {fundingPnL.longPnL >= 0 ? '+' : ''}${fundingPnL.longPnL.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground pl-4">
                    -{params.longFundingRate.toFixed(4)}% × ${(params.entryLongPrice * params.longQuantity).toLocaleString()} × {params.holdingPeriod}h
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-red-400">Short Position {params.shortFundingRate >= 0 ? '(получаем)' : '(платим)'}</span>
                    <span className={`font-mono font-bold ${fundingPnL.shortPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {fundingPnL.shortPnL >= 0 ? '+' : ''}${fundingPnL.shortPnL.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground pl-4">
                    +{params.shortFundingRate.toFixed(4)}% × ${(params.entryShortPrice * params.shortQuantity).toLocaleString()} × {params.holdingPeriod}h
                  </div>
                </div>

                <div className="pt-3 border-t flex justify-between items-center">
                  <span className="font-semibold">Total Funding PnL</span>
                  <span className={`font-mono font-bold text-xl ${fundingPnL.total >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {fundingPnL.total >= 0 ? '+' : ''}${fundingPnL.total.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Total PnL */}
            <Card className="border-2 border-primary">
              <CardHeader>
                <CardTitle className="text-lg">Итоговый PnL</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Price PnL</span>
                    <span className={`font-mono ${pricePnL.total >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {pricePnL.total >= 0 ? '+' : ''}${pricePnL.total.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Funding PnL</span>
                    <span className={`font-mono ${fundingPnL.total >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {fundingPnL.total >= 0 ? '+' : ''}${fundingPnL.total.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                  <div className="pt-3 border-t flex justify-between items-center">
                    <span className="font-bold text-lg">Total PnL</span>
                    <span className={`font-mono font-bold text-3xl ${metrics.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {metrics.totalPnL >= 0 ? '+' : ''}${metrics.totalPnL.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t">
                    <span className="text-sm text-muted-foreground">ROI</span>
                    <span className={`font-mono font-bold text-xl ${metrics.roi >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {metrics.roi >= 0 ? '+' : ''}{metrics.roi.toFixed(2)}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
