// Direct browser calls to The Odds API + mock data fallback + arbitrage logic

const BASE = 'https://api.the-odds-api.com/v4'

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

export const MOCK_MATCHES = [
  {
    id: 'mock_mi_csk',
    home_team: 'Mumbai Indians',
    away_team: 'Chennai Super Kings',
    commence_time: new Date(Date.now() + 2 * 3600_000).toISOString(),
    bookmakers: [
      { key: 'bet365',   title: 'Bet365',   markets: [{ key: 'h2h', outcomes: [{ name: 'Mumbai Indians', price: 1.85 }, { name: 'Chennai Super Kings', price: 2.10 }] }] },
      { key: 'pinnacle', title: 'Pinnacle', markets: [{ key: 'h2h', outcomes: [{ name: 'Mumbai Indians', price: 1.90 }, { name: 'Chennai Super Kings', price: 2.00 }] }] },
      { key: 'betfair',  title: 'Betfair',  markets: [{ key: 'h2h', outcomes: [{ name: 'Mumbai Indians', price: 1.88 }, { name: 'Chennai Super Kings', price: 2.05 }] }] },
      { key: 'sport888', title: '888sport', markets: [{ key: 'h2h', outcomes: [{ name: 'Mumbai Indians', price: 1.83 }, { name: 'Chennai Super Kings', price: 2.15 }] }] },
    ],
  },
  {
    id: 'mock_rcb_kkr',
    home_team: 'Royal Challengers Bangalore',
    away_team: 'Kolkata Knight Riders',
    commence_time: new Date(Date.now() + 6 * 3600_000).toISOString(),
    bookmakers: [
      { key: 'bet365',   title: 'Bet365',   markets: [{ key: 'h2h', outcomes: [{ name: 'Royal Challengers Bangalore', price: 2.20 }, { name: 'Kolkata Knight Riders', price: 1.75 }] }] },
      { key: 'pinnacle', title: 'Pinnacle', markets: [{ key: 'h2h', outcomes: [{ name: 'Royal Challengers Bangalore', price: 2.30 }, { name: 'Kolkata Knight Riders', price: 1.68 }] }] },
      { key: 'betfair',  title: 'Betfair',  markets: [{ key: 'h2h', outcomes: [{ name: 'Royal Challengers Bangalore', price: 2.25 }, { name: 'Kolkata Knight Riders', price: 1.72 }] }] },
    ],
  },
  {
    id: 'mock_srh_dc',
    home_team: 'Sunrisers Hyderabad',
    away_team: 'Delhi Capitals',
    commence_time: new Date(Date.now() + 26 * 3600_000).toISOString(),
    bookmakers: [
      { key: 'bet365',   title: 'Bet365',   markets: [{ key: 'h2h', outcomes: [{ name: 'Sunrisers Hyderabad', price: 1.95 }, { name: 'Delhi Capitals', price: 1.95 }] }] },
      { key: 'pinnacle', title: 'Pinnacle', markets: [{ key: 'h2h', outcomes: [{ name: 'Sunrisers Hyderabad', price: 2.05 }, { name: 'Delhi Capitals', price: 1.88 }] }] },
      { key: 'betfair',  title: 'Betfair',  markets: [{ key: 'h2h', outcomes: [{ name: 'Sunrisers Hyderabad', price: 1.98 }, { name: 'Delhi Capitals', price: 1.92 }] }] },
    ],
  },
]

// ---------------------------------------------------------------------------
// Live fetch
// ---------------------------------------------------------------------------

export async function fetchOdds(apiKey) {
  if (!apiKey) return { matches: enrichWithArb(MOCK_MATCHES), isMock: true, error: null }

  try {
    const res = await fetch(
      `${BASE}/sports/cricket_ipl/odds?apiKey=${encodeURIComponent(apiKey)}&regions=uk,eu,au&markets=h2h&oddsFormat=decimal`,
    )
    if (res.status === 401) return { matches: enrichWithArb(MOCK_MATCHES), isMock: true, error: 'Invalid API key' }
    if (!res.ok)            return { matches: enrichWithArb(MOCK_MATCHES), isMock: true, error: `API error ${res.status}` }
    const data = await res.json()
    const matches = (Array.isArray(data) && data.length > 0) ? data : MOCK_MATCHES
    return { matches: enrichWithArb(matches), isMock: matches === MOCK_MATCHES, error: null }
  } catch {
    return { matches: enrichWithArb(MOCK_MATCHES), isMock: true, error: 'Network error — showing demo data' }
  }
}

// ---------------------------------------------------------------------------
// Arbitrage calculation
// ---------------------------------------------------------------------------

function enrichWithArb(matches) {
  return matches.map(m => ({ ...m, arbitrage: calcArbitrage(m) }))
}

function calcArbitrage(match) {
  const best = {}
  for (const bm of match.bookmakers ?? []) {
    for (const mkt of bm.markets ?? []) {
      if (mkt.key !== 'h2h') continue
      for (const o of mkt.outcomes ?? []) {
        if (!best[o.name] || o.price > best[o.name].odds) {
          best[o.name] = { odds: o.price, bookmaker: bm.title, bmKey: bm.key }
        }
      }
    }
  }

  const teams = Object.keys(best)
  if (teams.length < 2) return null

  const arbPct    = teams.reduce((s, t) => s + 1 / best[t].odds, 0)
  const isArb     = arbPct < 1
  const profitPct = isArb ? +((1 - arbPct) * 100).toFixed(2) : null

  let optimalStakes = null
  if (isArb) {
    optimalStakes = {}
    for (const t of teams) {
      optimalStakes[t] = {
        bookmaker:        best[t].bookmaker,
        odds:             best[t].odds,
        stake:            +(1000 / (best[t].odds * arbPct)).toFixed(2),
        guaranteedReturn: +(1000 / arbPct).toFixed(2),
      }
    }
  }

  return {
    bestOdds:       best,
    arbPercentage:  +(arbPct * 100).toFixed(2),
    isArbitrage:    isArb,
    profitMargin:   profitPct,
    overRound:      isArb ? null : +((arbPct - 1) * 100).toFixed(2),
    optimalStakes,
  }
}
