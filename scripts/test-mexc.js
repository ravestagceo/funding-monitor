// Quick test for MEXC API
async function testMexc() {
  console.log('Testing MEXC API...\n')

  try {
    // Test single symbol
    const symbol = 'BTC_USDT'
    const url = `https://contract.mexc.com/api/v1/contract/funding_rate/${symbol}`

    console.log(`Fetching: ${url}`)
    const response = await fetch(url)

    console.log(`Status: ${response.status}`)

    if (!response.ok) {
      const text = await response.text()
      console.log('Error response:', text)
      return
    }

    const data = await response.json()
    console.log('\nMEXC Response:')
    console.log(JSON.stringify(data, null, 2))

    if (data.fundingRate) {
      const fundingPeriodHours = data.collectCycle || 8
      const hourlyRate = data.fundingRate / fundingPeriodHours
      console.log(`\nNormalized:`)
      console.log(`  Symbol: ${data.symbol.replace('_USDT', '')}`)
      console.log(`  Funding Rate: ${data.fundingRate} (${fundingPeriodHours}h period)`)
      console.log(`  Hourly Rate: ${hourlyRate}`)
      console.log(`  Next Funding: ${new Date(data.nextSettleTime).toISOString()}`)
    }

  } catch (error) {
    console.error('Error:', error.message)
  }
}

testMexc()
