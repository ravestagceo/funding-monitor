# Pre-Deployment Checklist

## ✅ Что уже сделано

- [x] Next.js 15 проект настроен с TypeScript
- [x] Tailwind CSS + shadcn/ui установлены и настроены
- [x] Supabase схема создана (schema.sql)
- [x] API routes для Binance реализованы
- [x] API routes для Lighter реализованы
- [x] API route для расчета спредов реализован
- [x] Cron job для автоматического обновления создан
- [x] UI компонент с таблицей реализован
- [x] Поиск по символу добавлен
- [x] Сортировка по всем колонкам добавлена
- [x] Цветовая индикация спредов
- [x] Auto-refresh каждые 5 минут
- [x] Responsive design
- [x] TypeScript типы для всех данных
- [x] vercel.json для cron jobs
- [x] README.md с документацией
- [x] DEPLOYMENT.md с инструкциями
- [x] EXAMPLES.md с примерами
- [x] PROJECT_SUMMARY.md с обзором
- [x] .env.local.example с примером конфигурации
- [x] Build успешно проходит

## 📋 Что нужно сделать перед deployment

### 1. Supabase Setup
- [ ] Создать проект на supabase.com
- [ ] Выполнить SQL из `supabase/schema.sql`
- [ ] Скопировать Project URL
- [ ] Скопировать anon public key
- [ ] Скопировать service_role key

### 2. GitHub Setup
- [ ] Создать репозиторий на GitHub
- [ ] Выполнить команды:
  ```bash
  git init
  git add .
  git commit -m "Initial commit: Funding Monitor"
  git branch -M main
  git remote add origin <your-repo-url>
  git push -u origin main
  ```

### 3. Vercel Setup
- [ ] Зайти на vercel.com
- [ ] Нажать "New Project"
- [ ] Импортировать GitHub репозиторий
- [ ] Добавить Environment Variables:
  - [ ] NEXT_PUBLIC_SUPABASE_URL
  - [ ] NEXT_PUBLIC_SUPABASE_ANON_KEY
  - [ ] SUPABASE_SERVICE_ROLE_KEY
  - [ ] CRON_SECRET (сгенерировать: `openssl rand -base64 32`)
- [ ] Deploy!

### 4. Post-Deployment Verification
- [ ] Открыть deployed URL
- [ ] Проверить, что таблица загружается
- [ ] Проверить поиск по символу
- [ ] Проверить сортировку
- [ ] Проверить /api/funding/binance endpoint
- [ ] Проверить /api/funding/lighter endpoint
- [ ] Проверить /api/funding/spreads endpoint
- [ ] Проверить cron job в Vercel Dashboard
- [ ] Подождать 5 минут и проверить данные в Supabase

### 5. Monitoring Setup
- [ ] Настроить Vercel алерты для критических ошибок
- [ ] Добавить проект в мониторинг (UptimeRobot, etc.)
- [ ] Проверить логи в Vercel Dashboard
- [ ] Проверить таблицы в Supabase Dashboard

## 🔍 Testing Commands

### Local Development
```bash
npm install
npm run dev
# Открыть http://localhost:3000
```

### Build Test
```bash
npm run build
npm start
```

### API Tests
```bash
# Binance API
curl http://localhost:3000/api/funding/binance

# Lighter API
curl http://localhost:3000/api/funding/lighter

# Spreads
curl http://localhost:3000/api/funding/spreads

# Cron (local test - установите .env.local)
curl -X GET "http://localhost:3000/api/cron/update-funding" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### Production Tests
```bash
# Замените your-domain.vercel.app на ваш домен

# Spreads
curl https://your-domain.vercel.app/api/funding/spreads

# Cron (manual trigger)
curl -X GET "https://your-domain.vercel.app/api/cron/update-funding" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

## 🚨 Common Issues

### Issue: Build fails with Supabase error
**Solution**: Убедитесь, что используете функции `getSupabase()` и `getServiceSupabase()` вместо прямого импорта клиента

### Issue: Cron job не запускается
**Solution**:
- Проверьте, что у вас Pro план Vercel (Hobby не поддерживает cron)
- Альтернатива: используйте cron-job.org

### Issue: No data in tables
**Solution**:
- Проверьте Row Level Security политики
- Убедитесь, что service_role key правильный
- Проверьте логи в Vercel

### Issue: CORS errors
**Solution**: API routes в Next.js автоматически настроены, но убедитесь что вызовы идут с того же домена

## 📊 Success Metrics

После деплоя вы должны видеть:
- ✅ ~70 пар в таблице
- ✅ Данные обновляются каждые 5 минут
- ✅ Поиск работает мгновенно
- ✅ Сортировка работает корректно
- ✅ В Supabase появляются новые записи каждые 5 минут
- ✅ API endpoints отвечают < 1 секунды

## 🎯 Optional Enhancements

После успешного деплоя можно добавить:
- [ ] Grafana/Datadog мониторинг
- [ ] Telegram бот для уведомлений
- [ ] Email алерты при больших спредах
- [ ] Historical charts
- [ ] CSV export
- [ ] Dark mode
- [ ] PWA support

## ✨ Ready to Deploy!

Когда все пункты из раздела "Что нужно сделать" выполнены, ваш проект будет полностью функционален в production!

Follow DEPLOYMENT.md для детальных инструкций.
