'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  BookOpen,
  TrendingUp,
  ArrowLeftRight,
  Clock,
  DollarSign,
  AlertCircle,
  BarChart3,
  Target,
  Zap,
  Eye
} from 'lucide-react'

export default function GuidePage() {
  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-[1200px] mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-foreground flex items-center justify-center gap-2">
            <BookOpen className="h-8 w-8 text-primary" />
            Руководство пользователя
          </h1>
          <p className="text-muted-foreground text-lg">
            Полное руководство по использованию мониторинга funding rate
          </p>
        </div>

        {/* What is Funding Rate */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              Что такое Funding Rate?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              <strong className="text-foreground">Funding rate</strong> — это периодический платёж между трейдерами
              на бессрочных фьючерсах (perpetual futures). Он помогает поддерживать цену фьючерса близко к спотовой цене.
            </p>

            <div className="grid md:grid-cols-2 gap-4 mt-4">
              <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                <div className="font-semibold text-green-400 mb-2">Положительный Funding Rate (+)</div>
                <p className="text-sm text-muted-foreground">
                  Лонги платят шортам. Означает, что цена фьючерса выше спотовой — рынок в лонгах.
                </p>
              </div>

              <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                <div className="font-semibold text-red-400 mb-2">Отрицательный Funding Rate (-)</div>
                <p className="text-sm text-muted-foreground">
                  Шорты платят лонгам. Означает, что цена фьючерса ниже спотовой — рынок в шортах.
                </p>
              </div>
            </div>

            <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-blue-400 mt-0.5" />
                <div>
                  <div className="font-semibold text-blue-400 mb-1">Периоды начисления</div>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• <strong>Binance, Bybit</strong>: каждые 4 или 8 часов</li>
                    <li>• <strong>Hyperliquid</strong>: каждый час</li>
                    <li>• <strong>Lighter</strong>: каждые 8 часов</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Arbitrage Strategy */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowLeftRight className="h-5 w-5 text-primary" />
              Арбитражная стратегия
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Вы можете зарабатывать на разнице funding rate между биржами, открывая противоположные позиции:
            </p>

            <div className="space-y-3">
              <div className="p-4 bg-card border rounded-lg">
                <div className="font-semibold text-foreground mb-2 flex items-center gap-2">
                  <Target className="h-4 w-4 text-green-400" />
                  Пример арбитража
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Binance BTC funding rate:</span>
                    <Badge variant="secondary" className="bg-green-500/20 text-green-400">+0.05% / час</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Hyperliquid BTC funding rate:</span>
                    <Badge variant="secondary" className="bg-red-500/20 text-red-400">-0.03% / час</Badge>
                  </div>
                  <div className="border-t pt-2 mt-2">
                    <div className="flex justify-between items-center font-semibold">
                      <span className="text-foreground">Spread (разница):</span>
                      <span className="text-green-400">0.08% / час</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <div className="font-semibold text-green-400 mb-2">🔼 LONG на Hyperliquid</div>
                  <p className="text-sm text-muted-foreground">
                    Получаете funding rate (-0.03% → вам платят +0.03%)
                  </p>
                </div>

                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <div className="font-semibold text-red-400 mb-2">🔽 SHORT на Binance</div>
                  <p className="text-sm text-muted-foreground">
                    Получаете funding rate (+0.05% → вам платят +0.05%)
                  </p>
                </div>
              </div>

              <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
                <div className="font-semibold text-primary mb-2">💰 Итоговый доход:</div>
                <div className="text-sm space-y-1">
                  <div className="text-muted-foreground">• Hourly: <span className="text-foreground font-semibold">0.08%</span></div>
                  <div className="text-muted-foreground">• Daily: <span className="text-foreground font-semibold">1.92%</span></div>
                  <div className="text-muted-foreground">• Annual APR: <span className="text-green-400 font-bold">701%</span></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Interface Guide */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              Интерфейс сайта
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Simple View */}
            <div>
              <h3 className="font-semibold text-lg text-foreground mb-3 flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-400" />
                Simple View (Простой вид)
              </h3>
              <p className="text-muted-foreground mb-3">
                Сравнение Binance и Lighter — подходит для быстрого анализа одной пары бирж.
              </p>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="p-3 bg-card border rounded-lg">
                  <div className="font-medium text-foreground mb-1">Symbol</div>
                  <p className="text-sm text-muted-foreground">Название криптовалюты (BTC, ETH, и т.д.)</p>
                </div>
                <div className="p-3 bg-card border rounded-lg">
                  <div className="font-medium text-foreground mb-1">Binance / Lighter (hourly)</div>
                  <p className="text-sm text-muted-foreground">Часовой funding rate на каждой бирже</p>
                </div>
                <div className="p-3 bg-card border rounded-lg">
                  <div className="font-medium text-foreground mb-1">Spread/hour</div>
                  <p className="text-sm text-muted-foreground">Разница между биржами за час</p>
                </div>
                <div className="p-3 bg-card border rounded-lg">
                  <div className="font-medium text-foreground mb-1">Daily/Annual APR</div>
                  <p className="text-sm text-muted-foreground">Потенциальная доходность (дневная/годовая)</p>
                </div>
                <div className="p-3 bg-card border rounded-lg">
                  <div className="font-medium text-foreground mb-1">Stability</div>
                  <p className="text-sm text-muted-foreground">Оценка стабильности возможности (High/Med/Low)</p>
                </div>
                <div className="p-3 bg-card border rounded-lg">
                  <div className="font-medium text-foreground mb-1">Next Funding</div>
                  <p className="text-sm text-muted-foreground">Обратный отсчёт до следующей выплаты</p>
                </div>
              </div>
              <div className="mt-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <p className="text-sm text-blue-300">
                  <strong>Совет:</strong> Кликните на строку для просмотра исторических данных и графика спреда.
                </p>
              </div>
            </div>

            {/* Spread History Modal */}
            <div className="mt-6">
              <h3 className="font-semibold text-lg text-foreground mb-3 flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-purple-400" />
                Модальное окно с историей спреда
              </h3>
              <p className="text-muted-foreground mb-3">
                При клике на любую строку в таблице открывается детальная аналитика по выбранному символу.
              </p>

              <div className="space-y-3">
                <div className="p-4 bg-card border rounded-lg">
                  <div className="font-medium text-foreground mb-2">Временные периоды</div>
                  <div className="grid grid-cols-4 gap-2 text-sm">
                    <div className="p-2 bg-secondary rounded text-center">1h</div>
                    <div className="p-2 bg-secondary rounded text-center">6h</div>
                    <div className="p-2 bg-secondary rounded text-center">12h</div>
                    <div className="p-2 bg-secondary rounded text-center">24h</div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Выберите период для анализа исторических данных
                  </p>
                </div>

                <div className="p-4 bg-card border rounded-lg">
                  <div className="font-medium text-foreground mb-2">Статистические показатели</div>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex justify-between">
                      <span><strong className="text-foreground">Avg Spread</strong></span>
                      <span>Средний спред за выбранный период</span>
                    </div>
                    <div className="flex justify-between">
                      <span><strong className="text-foreground">Volatility</strong></span>
                      <span>Волатильность спреда (стандартное отклонение)</span>
                    </div>
                    <div className="flex justify-between">
                      <span><strong className="text-foreground">Min / Max</strong></span>
                      <span>Минимальный и максимальный спред</span>
                    </div>
                    <div className="flex justify-between">
                      <span><strong className="text-foreground">Stability</strong></span>
                      <span>Процент времени когда спред был прибыльным</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-card border rounded-lg">
                  <div className="font-medium text-foreground mb-2">Графики</div>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div>
                      <strong className="text-foreground">Spread Over Time</strong> — динамика спреда во времени.
                      Показывает как менялась разница между биржами.
                    </div>
                    <div>
                      <strong className="text-foreground">Funding Rates Comparison</strong> — сравнение funding rates
                      каждой биржи. Разные цвета линий = разные биржи.
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-card border rounded-lg">
                  <div className="font-medium text-foreground mb-2">Profitability Analysis</div>
                  <div className="text-sm text-muted-foreground">
                    Показывает процент времени когда спред был прибыльным (больше порогового значения).
                    Помогает оценить стабильность арбитражной возможности.
                  </div>
                </div>

                <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <p className="text-sm text-yellow-300">
                    <strong>Интерпретация:</strong> Высокая стабильность (50%+) и низкая волатильность означают
                    надёжную возможность для арбитража. Резкие колебания на графике — признак нестабильности.
                  </p>
                </div>
              </div>
            </div>

            {/* Matrix View */}
            <div>
              <h3 className="font-semibold text-lg text-foreground mb-3 flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-green-400" />
                Matrix View (Матричный вид)
              </h3>
              <p className="text-muted-foreground mb-3">
                Сравнение всех 4 бирж одновременно — позволяет найти лучший спред среди любых пар.
              </p>
              <div className="space-y-3">
                <div className="p-4 bg-card border rounded-lg">
                  <div className="font-medium text-foreground mb-2">Цветовые индикаторы</div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-6 bg-green-500/20 border border-green-500 rounded flex items-center justify-center text-xs">
                        LONG
                      </div>
                      <span className="text-muted-foreground">Открывайте длинную позицию на этой бирже</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-6 bg-red-500/20 border border-red-500 rounded flex items-center justify-center text-xs">
                        SHORT
                      </div>
                      <span className="text-muted-foreground">Открывайте короткую позицию на этой бирже</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-card border rounded-lg">
                  <div className="font-medium text-foreground mb-2">Колонки таблицы</div>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div>• <strong className="text-foreground">Symbol:</strong> Название криптовалюты</div>
                    <div>• <strong className="text-foreground">Binance/Hyperliquid/Bybit/Lighter:</strong> Часовой funding rate</div>
                    <div>• <strong className="text-foreground">Best Spread:</strong> Максимальная разница между любыми двумя биржами</div>
                    <div>• <strong className="text-foreground">Strategy:</strong> Оптимальная пара бирж (L = Long, S = Short)</div>
                    <div>• <strong className="text-foreground">Annual APR:</strong> Годовая доходность при таком спреде</div>
                  </div>
                </div>

                <div className="p-4 bg-card border rounded-lg">
                  <div className="font-medium text-foreground mb-2">Статистика вверху</div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                    <div className="p-2 bg-yellow-500/10 rounded">
                      <div className="text-yellow-400 font-semibold">Binance</div>
                      <div className="text-muted-foreground">Количество пар</div>
                    </div>
                    <div className="p-2 bg-green-500/10 rounded">
                      <div className="text-green-400 font-semibold">Hyperliquid</div>
                      <div className="text-muted-foreground">Количество пар</div>
                    </div>
                    <div className="p-2 bg-orange-500/10 rounded">
                      <div className="text-orange-400 font-semibold">Bybit</div>
                      <div className="text-muted-foreground">Количество пар</div>
                    </div>
                    <div className="p-2 bg-emerald-500/10 rounded">
                      <div className="text-emerald-400 font-semibold">Lighter</div>
                      <div className="text-muted-foreground">Количество пар</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tips & Warnings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-primary" />
              Важные замечания
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
              <div className="font-semibold text-green-400 mb-2">✅ Преимущества</div>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Дельта-нейтральная стратегия (не зависит от направления рынка)</li>
                <li>• Пассивный доход без активной торговли</li>
                <li>• Данные обновляются каждые 5 минут</li>
                <li>• Все ставки нормализованы к часовому показателю</li>
              </ul>
            </div>

            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <div className="font-semibold text-red-400 mb-2">⚠️ Риски</div>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Funding rate может измениться в любой момент</li>
                <li>• Комиссии за открытие/закрытие позиций снижают прибыль</li>
                <li>• Проскальзывание при входе в позицию</li>
                <li>• Риск ликвидации при сильных движениях цены</li>
                <li>• Требуется капитал на обеих биржах одновременно</li>
              </ul>
            </div>

            <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <div className="font-semibold text-yellow-400 mb-2">💡 Советы</div>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Ищите стабильные спреды ({'>'} 0.05% hourly)</li>
                <li>• Проверяйте ликвидность на обеих биржах</li>
                <li>• Учитывайте комиссии (обычно ~0.05% за сделку)</li>
                <li>• Используйте низкое плечо (2-5x) для снижения риска ликвидации</li>
                <li>• Регулярно ребалансируйте позиции</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Technical Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Технические детали
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="p-3 bg-card border rounded-lg">
                <div className="font-medium text-foreground mb-1">Периоды обновления</div>
                <div className="text-muted-foreground">
                  Данные на сайте обновляются каждые <strong className="text-foreground">5 минут</strong>
                </div>
              </div>

              <div className="p-3 bg-card border rounded-lg">
                <div className="font-medium text-foreground mb-1">Нормализация ставок</div>
                <div className="text-muted-foreground">
                  Все funding rates приведены к часовому показателю для корректного сравнения между биржами
                </div>
              </div>

              <div className="p-3 bg-card border rounded-lg">
                <div className="font-medium text-foreground mb-1">Источники данных</div>
                <div className="text-muted-foreground space-y-1">
                  <div>• Binance: <code className="text-xs bg-secondary px-1 py-0.5 rounded">/fapi/v1/premiumIndex</code></div>
                  <div>• Hyperliquid: <code className="text-xs bg-secondary px-1 py-0.5 rounded">POST /info metaAndAssetCtxs</code></div>
                  <div>• Bybit: <code className="text-xs bg-secondary px-1 py-0.5 rounded">/v5/market/tickers</code></div>
                  <div>• Lighter: <code className="text-xs bg-secondary px-1 py-0.5 rounded">/api/v1/funding-rates</code></div>
                </div>
              </div>

              <div className="p-3 bg-card border rounded-lg">
                <div className="font-medium text-foreground mb-1">Расчёт спреда</div>
                <div className="text-muted-foreground">
                  <code className="text-xs bg-secondary px-2 py-1 rounded block mt-2">
                    Spread = |Exchange1_hourly - Exchange2_hourly| × 100%
                  </code>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground py-6">
          <p>Этот инструмент предоставляет информацию для анализа, но не является финансовым советом.</p>
          <p className="mt-1">Всегда проводите собственное исследование и оценивайте риски перед торговлей.</p>
        </div>
      </div>
    </div>
  )
}
