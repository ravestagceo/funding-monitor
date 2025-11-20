# Deployment Guide

## Quick Start на Vercel

### Шаг 1: Настройка Supabase

1. Зайдите на [supabase.com](https://supabase.com) и создайте новый проект
2. Перейдите в **SQL Editor**
3. Скопируйте содержимое файла `supabase/schema.sql` и выполните его
4. Перейдите в **Settings → API** и скопируйте:
   - Project URL
   - anon public key
   - service_role key (секретный ключ)

### Шаг 2: Подготовка репозитория

```bash
# Инициализируйте git репозиторий
git init

# Добавьте все файлы
git add .

# Создайте первый коммит
git commit -m "Initial commit: Funding Monitor"

# Создайте репозиторий на GitHub и подключите его
git remote add origin https://github.com/ваш-username/funding-monitor.git
git branch -M main
git push -u origin main
```

### Шаг 3: Deploy на Vercel

1. Зайдите на [vercel.com](https://vercel.com)
2. Нажмите **"New Project"**
3. Импортируйте ваш GitHub репозиторий
4. В разделе **Environment Variables** добавьте:

```env
NEXT_PUBLIC_SUPABASE_URL=ваш_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=ваш_anon_key
SUPABASE_SERVICE_ROLE_KEY=ваш_service_role_key
CRON_SECRET=сгенерируйте_случайную_строку
```

Для генерации `CRON_SECRET`:
```bash
openssl rand -base64 32
```

5. Нажмите **"Deploy"**

### Шаг 4: Проверка работы

После деплоя:

1. Откройте ваш сайт (например, `https://funding-monitor.vercel.app`)
2. Вы должны увидеть таблицу со спредами funding rates
3. Проверьте, что cron job работает:
   - Перейдите в Vercel Dashboard → ваш проект → Cron
   - Вы должны увидеть задачу на `/api/cron/update-funding` (каждые 5 минут)

### Шаг 5: Ручное тестирование Cron Job

```bash
curl -X GET "https://ваш-домен.vercel.app/api/cron/update-funding" \
  -H "Authorization: Bearer ваш_CRON_SECRET"
```

Если все работает, вы получите:
```json
{
  "success": true,
  "message": "Funding rates updated successfully",
  "stats": {
    "binanceRecords": 400+,
    "lighterRecords": 70+,
    "spreadRecords": 70+
  }
}
```

## Проверка данных в Supabase

1. Перейдите в Supabase Dashboard → Table Editor
2. Откройте таблицу `funding_rates` - вы должны видеть записи от обеих бирж
3. Откройте таблицу `funding_spreads` - вы должны видеть рассчитанные спреды

## Troubleshooting

### Cron job не запускается

- Убедитесь, что `vercel.json` находится в корне проекта
- Проверьте, что ваш Vercel план поддерживает Cron Jobs (требуется Pro план)
- Для Hobby плана используйте внешний сервис типа cron-job.org

### Ошибки "Unauthorized" в cron endpoint

- Проверьте, что `CRON_SECRET` установлен в Environment Variables
- Убедитесь, что вы передаете правильный заголовок Authorization

### Нет данных в таблице

- Проверьте Row Level Security политики в Supabase
- Убедитесь, что service role key правильный
- Проверьте логи в Vercel Dashboard

## Альтернатива для Hobby плана

Если у вас Hobby план Vercel (без cron jobs):

1. Используйте [cron-job.org](https://cron-job.org)
2. Создайте задание:
   - URL: `https://ваш-домен.vercel.app/api/cron/update-funding`
   - Method: GET
   - Header: `Authorization: Bearer ваш_CRON_SECRET`
   - Schedule: Every 5 minutes

## Monitoring

Следите за работой системы:

1. Vercel Dashboard → ваш проект → Logs
2. Supabase Dashboard → Table Editor (проверяйте новые записи)
3. Настройте алерты в Vercel для критических ошибок

## Production Checklist

- [ ] Supabase проект создан
- [ ] SQL схема применена
- [ ] Все environment variables настроены
- [ ] Проект задеплоен на Vercel
- [ ] Cron job настроен и работает
- [ ] Данные сохраняются в Supabase
- [ ] UI показывает актуальные спреды
- [ ] Настроен мониторинг и алерты
