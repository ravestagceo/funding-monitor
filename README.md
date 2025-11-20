# Funding Rate Monitor

Real-time funding rate spread monitoring between Binance and Lighter DEX. Track arbitrage opportunities across perpetual futures markets.

## Features

- **Real-time Data**: Fetches funding rates from Binance and Lighter DEX APIs
- **Spread Calculation**: Automatically calculates percentage spreads between exchanges
- **Historical Storage**: Saves all data to Supabase for trend analysis
- **Auto-refresh**: Updates every 5 minutes via Vercel Cron Jobs
- **Advanced Filtering**: Search and sort by symbol, rates, or spreads
- **Beautiful UI**: Built with shadcn/ui components and Tailwind CSS
- **Responsive Design**: Works perfectly on desktop and mobile

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Database**: Supabase (PostgreSQL)
- **Deployment**: Vercel
- **APIs**: Binance Futures API, Lighter DEX API

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account
- Vercel account (for deployment)

### 1. Clone the repository

\`\`\`bash
git clone <your-repo-url>
cd funding-monitor
\`\`\`

### 2. Install dependencies

\`\`\`bash
npm install
\`\`\`

### 3. Set up Supabase

1. Create a new project in [Supabase](https://supabase.com)
2. Go to SQL Editor and run the schema from \`supabase/schema.sql\`
3. Get your project URL and API keys from Settings > API

### 4. Configure environment variables

Create a \`.env.local\` file:

\`\`\`env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Cron Secret (generate a random string)
CRON_SECRET=your_random_secret_string
\`\`\`

### 5. Run development server

\`\`\`bash
npm run dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Deployment to Vercel

### 1. Push to GitHub

\`\`\`bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin <your-github-repo-url>
git push -u origin main
\`\`\`

### 2. Deploy to Vercel

1. Go to [Vercel](https://vercel.com)
2. Click "New Project"
3. Import your GitHub repository
4. Add environment variables:
   - \`NEXT_PUBLIC_SUPABASE_URL\`
   - \`NEXT_PUBLIC_SUPABASE_ANON_KEY\`
   - \`SUPABASE_SERVICE_ROLE_KEY\`
   - \`CRON_SECRET\`
5. Click "Deploy"

### 3. Configure Cron Jobs

The \`vercel.json\` file already configures a cron job to run every 5 minutes:

\`\`\`json
{
  "crons": [
    {
      "path": "/api/cron/update-funding",
      "schedule": "*/5 * * * *"
    }
  ]
}
\`\`\`

Vercel will automatically set up the cron job. To manually trigger it:

\`\`\`bash
curl -X GET "https://your-domain.vercel.app/api/cron/update-funding" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
\`\`\`

## API Endpoints

### GET /api/funding/binance
Fetches current funding rates from Binance

### GET /api/funding/lighter
Fetches current funding rates from Lighter DEX

### GET /api/funding/spreads
Calculates and returns funding rate spreads for matched symbols

### GET /api/cron/update-funding
Cron endpoint that fetches data and saves to Supabase (requires auth header)

## How It Works

1. **Data Collection**: Every 5 minutes, the cron job fetches funding rates from both Binance and Lighter DEX
2. **Symbol Matching**: The system matches symbols between exchanges (e.g., BTC on Lighter → BTCUSDT on Binance)
3. **Spread Calculation**: Calculates the percentage difference: \`(Binance Rate - Lighter Rate) × 100%\`
4. **Storage**: Saves all data to Supabase for historical analysis
5. **Display**: The UI fetches and displays spreads with real-time updates

## Understanding the Data

- **Funding Rate**: The periodic payment between long and short traders
- **Spread**: The difference between Binance and Lighter funding rates
- **Annual APR**: Annualized spread assuming 3 funding periods per day
- **Positive Spread**: Binance rate is higher (potential to long on Lighter, short on Binance)
- **Negative Spread**: Lighter rate is higher (potential to short on Lighter, long on Binance)

## Contributing

Pull requests are welcome! For major changes, please open an issue first.

## License

MIT

## Disclaimer

This tool is for informational purposes only. Always do your own research before making trading decisions. Funding rates can change rapidly and arbitrage opportunities may not account for transaction costs, slippage, or other risks.
