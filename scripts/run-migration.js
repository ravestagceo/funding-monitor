const fs = require('fs')
const path = require('path')

// Load environment variables manually (simple parsing)
const envPath = path.join(__dirname, '..', '.env.local')
const envFile = fs.readFileSync(envPath, 'utf8')
const env = {}
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/)
  if (match) {
    env[match[1]] = match[2]
  }
})

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

async function runMigration() {
  try {
    // Get migration file from command line or use default
    const migrationFile = process.argv[2] || 'add_exchange_columns.sql'

    // Read migration file
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', migrationFile)
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')

    console.log('Running migration...')
    console.log('='.repeat(60))
    console.log(migrationSQL)
    console.log('='.repeat(60))

    // Use fetch to execute the SQL via Supabase REST API
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`
      },
      body: JSON.stringify({ query: migrationSQL })
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('API Error:', error)

      // If RPC doesn't exist, show instructions
      console.log('\n' + '='.repeat(60))
      console.log('The migration needs to be run manually.')
      console.log('Please copy the SQL above and run it in:')
      console.log('1. Go to: https://supabase.com/dashboard/project/_/sql/new')
      console.log('2. Paste the migration SQL from: supabase/migrations/' + migrationFile)
      console.log('3. Click "Run"')
      console.log('='.repeat(60))
      return
    }

    console.log('\n✓ Migration completed successfully!')
  } catch (error) {
    console.error('Migration failed:', error.message)

    const migrationFile = process.argv[2] || 'add_exchange_columns.sql'
    console.log('\n' + '='.repeat(60))
    console.log('Please run the migration manually:')
    console.log('1. Go to: https://supabase.com/dashboard/project/_/sql/new')
    console.log('2. Copy the SQL from: supabase/migrations/' + migrationFile)
    console.log('3. Paste and click "Run"')
    console.log('='.repeat(60))
  }
}

runMigration()
