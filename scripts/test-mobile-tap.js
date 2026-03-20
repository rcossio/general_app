const { chromium, devices } = require('playwright')

const BASE = 'http://localhost:3000'
const TEST_EMAIL = `taptest_${Date.now()}@test.com`
const TEST_PASS = 'Password123!'

;(async () => {
  const iPhone = devices['iPhone 12']
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    ...iPhone,
    geolocation: { latitude: 45.01513449199466, longitude: 8.62788452481497, accuracy: 10 },
    permissions: ['geolocation'],
  })
  const page = await context.newPage()
  page.on('console', msg => {
    if (['error', 'warn'].includes(msg.type())) console.log(`[${msg.type()}] ${msg.text()}`)
  })

  // Register via browser form so cookies are set correctly
  console.log('Registering via browser...')
  await page.goto(`${BASE}/register`)
  await page.waitForSelector('input[type="email"]')
  // Fill in order: text (name), email, password
  const inputs = await page.$$('input')
  await inputs[0].fill('Tap Test')   // name
  await inputs[1].fill(TEST_EMAIL)   // email
  await inputs[2].fill(TEST_PASS)    // password
  await page.click('button[type="submit"]')
  await page.waitForTimeout(3000)
  console.log('After register, URL:', page.url())

  // Get access token via refresh (uses httpOnly cookie set during register)
  const tokenRes = await page.evaluate(async (base) => {
    const res = await fetch(`${base}/api/auth/refresh`, { method: 'POST', credentials: 'include' })
    return res.json()
  }, BASE)
  const accessToken = tokenRes.data?.accessToken
  console.log('Access token obtained:', !!accessToken)

  // Get a game session via API using the auth cookie
  const gamesRes = await page.evaluate(async ({ base, token }) => {
    const res = await fetch(`${base}/api/adventure/games`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    return res.json()
  }, { base: BASE, token: accessToken })
  const game = gamesRes.data?.find(g => g.slug === 'chapter-1')
  if (!game) { console.error('chapter-1 not found:', gamesRes); process.exit(1) }
  console.log('Game:', game.title)

  const sessRes = await page.evaluate(async ({ base, gameId, token }) => {
    const res = await fetch(`${base}/api/adventure/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ gameId }),
    })
    return res.json()
  }, { base: BASE, gameId: game.id, token: accessToken })
  const sessionId = sessRes.data?.sessionId
  if (!sessionId) { console.error('Session failed:', sessRes); process.exit(1) }
  console.log('Session:', sessionId)

  // Navigate to the adventure map
  await page.goto(`${BASE}/adventure/${sessionId}`)
  await page.waitForTimeout(5000)
  await page.screenshot({ path: '/tmp/map-before-tap.png' })
  console.log('Screenshot: /tmp/map-before-tap.png')

  const mapEl = await page.$('.leaflet-container')
  console.log('Map loaded:', !!mapEl)

  const circles = await page.$$('path.leaflet-interactive')
  console.log('Interactive SVG circles:', circles.length)

  if (circles.length > 0) {
    const box = await circles[0].boundingBox()
    console.log('First circle bbox:', JSON.stringify(box))
    if (box) {
      const cx = box.x + box.width / 2
      const cy = box.y + box.height / 2
      console.log(`Tapping at (${cx.toFixed(0)}, ${cy.toFixed(0)})...`)
      await page.touchscreen.tap(cx, cy)
      await page.waitForTimeout(1500)
      await page.screenshot({ path: '/tmp/map-after-tap.png' })
      console.log('Screenshot: /tmp/map-after-tap.png')
      const sheet = await page.$('.rounded-t-2xl')
      console.log('Location sheet appeared:', !!sheet)
      if (sheet) {
        console.log('Sheet text:', (await sheet.textContent())?.slice(0, 200))
      }
    }
  } else {
    console.log('No circles — dumping visible text:')
    console.log(await page.evaluate(() => document.body.innerText.slice(0, 300)))
  }

  await browser.close()
})().catch(e => { console.error(e); process.exit(1) })
