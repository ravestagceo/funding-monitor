# Usage Examples

## API Examples

### 1. Получить funding rates с Binance

```bash
curl https://your-domain.vercel.app/api/funding/binance
```

Response:
```json
{
  "success": true,
  "data": [
    {
      "symbol": "BTCUSDT",
      "markPrice": "95432.50",
      "lastFundingRate": "0.00008115",
      "nextFundingTime": 1763582400000
    },
    ...
  ],
  "count": 400,
  "timestamp": "2025-11-19T12:00:00.000Z"
}
```

### 2. Получить funding rates с Lighter

```bash
curl https://your-domain.vercel.app/api/funding/lighter
```

Response:
```json
{
  "success": true,
  "data": [
    {
      "market_id": 1,
      "exchange": "binance",
      "symbol": "BTC",
      "rate": 0.00008115
    },
    ...
  ],
  "count": 70,
  "timestamp": "2025-11-19T12:00:00.000Z"
}
```

### 3. Получить спреды между биржами

```bash
curl https://your-domain.vercel.app/api/funding/spreads
```

Response:
```json
{
  "success": true,
  "data": [
    {
      "symbol": "BTC",
      "binanceRate": 0.00008115,
      "lighterRate": 0.00003309,
      "spreadPercent": 0.0048,
      "binanceMarkPrice": 95432.50,
      "annualizedSpread": 5.256,
      "updatedAt": "2025-11-19T12:00:00.000Z"
    },
    ...
  ],
  "count": 70,
  "timestamp": "2025-11-19T12:00:00.000Z",
  "stats": {
    "totalBinanceSymbols": 400,
    "totalLighterSymbols": 70,
    "matchedSymbols": 70
  }
}
```

### 4. Вручную запустить обновление данных

```bash
curl -X GET "https://your-domain.vercel.app/api/cron/update-funding" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

Response:
```json
{
  "success": true,
  "message": "Funding rates updated successfully",
  "stats": {
    "binanceRecords": 432,
    "lighterRecords": 72,
    "spreadRecords": 72
  },
  "timestamp": "2025-11-19T12:00:00.000Z"
}
```

## Интерпретация данных

### Положительный спред (Binance > Lighter)

```
Symbol: ETH
Binance Rate: +0.0100%
Lighter Rate: +0.0050%
Spread: +0.0050%
```

**Стратегия**:
- Long на Lighter (платите меньший funding)
- Short на Binance (получаете больший funding)
- Потенциальная прибыль: 0.0050% каждые 8 часов

### Отрицательный спред (Lighter > Binance)

```
Symbol: SOL
Binance Rate: -0.0080%
Lighter Rate: -0.0030%
Spread: -0.0050%
```

**Стратегия**:
- Short на Lighter (получаете больший funding)
- Long на Binance (платите меньший funding)
- Потенциальная прибыль: 0.0050% каждые 8 часов

### Annual APR расчет

```
Hourly Rate: 0.0050%
Daily (3 periods): 0.0050% × 3 = 0.015%
Annual: 0.015% × 365 = 5.475%
```

## SQL Queries для анализа

### Топ 10 пар по абсолютному спреду

```sql
SELECT
  symbol,
  binance_rate,
  lighter_rate,
  spread_percent,
  ABS(spread_percent) as abs_spread
FROM latest_funding_spreads
ORDER BY abs_spread DESC
LIMIT 10;
```

### История спреда для конкретного символа

```sql
SELECT
  symbol,
  spread_percent,
  created_at
FROM funding_spreads
WHERE symbol = 'BTC'
  AND created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;
```

### Средний спред по времени суток

```sql
SELECT
  EXTRACT(HOUR FROM created_at) as hour,
  AVG(spread_percent) as avg_spread,
  COUNT(*) as count
FROM funding_spreads
WHERE symbol = 'ETH'
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY hour
ORDER BY hour;
```

### Поиск арбитражных возможностей (спред > 0.05%)

```sql
SELECT
  symbol,
  spread_percent,
  binance_rate,
  lighter_rate,
  spread_percent * 365 * 3 as annual_apr
FROM latest_funding_spreads
WHERE ABS(spread_percent) > 0.05
ORDER BY ABS(spread_percent) DESC;
```

## JavaScript Examples

### Fetch spreads в браузере

```javascript
async function getFundingSpreads() {
  const response = await fetch('/api/funding/spreads')
  const data = await response.json()

  if (data.success) {
    // Сортировка по абсолютному спреду
    const sorted = data.data.sort((a, b) =>
      Math.abs(b.spreadPercent) - Math.abs(a.spreadPercent)
    )

    console.log('Top opportunities:', sorted.slice(0, 5))
  }
}
```

### Мониторинг изменений

```javascript
let previousSpreads = []

async function monitorSpreads() {
  const response = await fetch('/api/funding/spreads')
  const data = await response.json()

  if (data.success) {
    data.data.forEach(current => {
      const previous = previousSpreads.find(p => p.symbol === current.symbol)

      if (previous) {
        const change = current.spreadPercent - previous.spreadPercent

        if (Math.abs(change) > 0.02) {
          console.log(`Alert: ${current.symbol} spread changed by ${change.toFixed(4)}%`)
        }
      }
    })

    previousSpreads = data.data
  }
}

// Запуск каждую минуту
setInterval(monitorSpreads, 60000)
```

## Python Examples

### Анализ данных с pandas

```python
import requests
import pandas as pd

# Получить спреды
response = requests.get('https://your-domain.vercel.app/api/funding/spreads')
data = response.json()

# Конвертировать в DataFrame
df = pd.DataFrame(data['data'])

# Топ 10 по абсолютному спреду
df['abs_spread'] = df['spreadPercent'].abs()
top_spreads = df.nlargest(10, 'abs_spread')

print(top_spreads[['symbol', 'spreadPercent', 'annualizedSpread']])

# Статистика
print(f"Mean spread: {df['spreadPercent'].mean():.4f}%")
print(f"Median spread: {df['spreadPercent'].median():.4f}%")
print(f"Std deviation: {df['spreadPercent'].std():.4f}%")
```

### Бот для Telegram уведомлений

```python
import requests
import time
from telegram import Bot

TELEGRAM_TOKEN = 'your-bot-token'
CHAT_ID = 'your-chat-id'
API_URL = 'https://your-domain.vercel.app/api/funding/spreads'
THRESHOLD = 0.05  # 0.05% spread

bot = Bot(token=TELEGRAM_TOKEN)

def check_opportunities():
    response = requests.get(API_URL)
    data = response.json()

    if data['success']:
        for spread in data['data']:
            if abs(spread['spreadPercent']) > THRESHOLD:
                message = f"""
🚨 Arbitrage Opportunity!
Symbol: {spread['symbol']}
Spread: {spread['spreadPercent']:.4f}%
Annual APR: {spread['annualizedSpread']:.2f}%
Binance: {spread['binanceRate'] * 100:.4f}%
Lighter: {spread['lighterRate'] * 100:.4f}%
                """
                bot.send_message(chat_id=CHAT_ID, text=message)

# Запуск каждые 5 минут
while True:
    check_opportunities()
    time.sleep(300)
```

## Важные замечания

1. **Частота обновления**: Данные обновляются каждые 5 минут
2. **Задержка данных**: API могут иметь небольшую задержку
3. **Costs**: Учитывайте комиссии за трейдинг при расчете прибыльности
4. **Slippage**: Большие позиции могут испытывать проскальзывание
5. **Funding time**: Funding обычно происходит каждые 8 часов
6. **Risk**: Цена актива может двигаться против вашей позиции
