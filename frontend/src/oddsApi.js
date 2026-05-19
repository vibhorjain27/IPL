// Betfair-only data feed with simulated lay prices
// Back odds from The Odds API; lay odds = back + realistic exchange spread

const BASE = 'https://api.the-odds-api.com/v4'

// Betfair bookmaker keys used by The Odds API
const BETFAIR_KEYS = ['betfair_ex_best_odds', 'betfair_sb', 'betfair']

// Realistic lay spread based on price range (mirrors Betfair tick sizes)
function layOdds(back) {
  if (back < 1.5)  return +(back + 0.01).toFixed(2)
  if (back < 2.0)  return +(back + 0.02).toFixed(2)
  if (back < 3.0)  return +(back + 0.04).toFixed(2)
  if (back < 5.0)  return +(back + 0.10).toFixed(2)
  return +(back + 0.20).toFixed(2)
}

// ---------------------------------------------------------------------------
// Mock data — realistic IPL exchange prices
// ---------------------------------------------------------------------------

export const MOCK_MATCHES = [
  {
    id: 'mock_mi_csk',
    home_team: 'Mumbai Indians',
    away_team: 'Chennai Super Kings',
    commence_time: new Date(Date.now() + 2 * 3600_000).toISOString(),
    teams: [
      { name: 'Mumbai Indians',     back: 1.90, lay: layOdds(1.90) },
      { name: 'Chennai Super Kings',back: 2.12, lay: layOdds(2.12) },
    ],
  },
  {
    id: 'mock_rcb_kkr',
    home_team: 'Royal Challengers Bangalore',
    away_team: 'Kolkata Knight Riders',
    commence_time: new Date(Date.now() + 6 * 3600_000).toISOString(),
    teams: [
      { name: 'Royal Challengers Bangalore', back: 2.28, lay: layOdds(2.28) },
      { name: 'Kolkata Knight Riders',       back: 1.72, lay: layOdds(1.72) },
    ],
  },
  {
    id: 'mock_srh_dc',
    home_team: 'Sunrisers Hyderabad',
    away_team: 'Delhi Capitals',
    commence_time: new Date(Date.now() + 26 * 3600_000).toISOString(),
    teams: [
      { name: 'Sunrisers Hyderabad', back: 1.96, lay: layOdds(1.96) },
      { name: 'Delhi Capitals',      back: 2.00, lay: layOdds(2.00) },
    ],
  },
]

// ---------------------------------------------------------------------------
// Normalize a raw Odds API match to our internal format (Betfair only)
// ---------------------------------------------------------------------------

function normalize(raw) {
  const betfairBm = raw.bookmakers?.find(bm => BETFAIR_KEYS.includes(bm.key))
  const h2h = betfairBm?.markets?.find(m => m.key === 'h2h')
  if (!h2h) return null

  const teams = h2h.outcomes.map(o => ({
    name: o.name,
    back: o.price,
    lay:  layOdds(o.price),
  }))

  return {
    id:           raw.id,
    home_team:    raw.home_team,
    away_team:    raw.away_team,
    commence_time:raw.commence_time,
    teams,
  }
}

// ---------------------------------------------------------------------------
// Arbitrage: within one match, back both teams
// arb exists when 1/back_A + 1/back_B < 1
// ---------------------------------------------------------------------------

export function calcArbitrage(match) {
  const { teams } = match
  if (!teams || teams.length < 2) return null

  const arbPct  = teams.reduce((s, t) => s + 1 / t.back, 0)
  const isArb   = arbPct < 1
  const margin  = +((arbPct - 1) * 100).toFixed(2)  // positive = bookmaker edge
  const profit  = isArb ? +((1 - arbPct) * 100).toFixed(2) : null

  // Optimal stakes for ₹1,000 guaranteed return
  let optimalStakes = null
  if (isArb) {
    optimalStakes = {}
    const ret = 1000 / arbPct
    for (const t of teams) {
      optimalStakes[t.name] = {
        stake:            +(ret / t.back).toFixed(2),
        guaranteedReturn: +ret.toFixed(2),
        back:             t.back,
      }
    }
  }

  return {
    arbPct:         +(arbPct * 100).toFixed(2),
    isArb,
    bookmarginPct:  isArb ? null : margin,
    profitPct:      profit,
    optimalStakes,
  }
}

// ---------------------------------------------------------------------------
// Main fetch
// ---------------------------------------------------------------------------

export async function fetchOdds(apiKey) {
  if (!apiKey) {
    const matches = MOCK_MATCHES.map(m => ({ ...m, arbitrage: calcArbitrage(m) }))
    return { matches, isMock: true, error: null }
  }

  try {
    const res = await fetch(
      `${BASE}/sports/cricket_ipl/odds?apiKey=${encodeURIComponent(apiKey)}&regions=uk,eu,au&markets=h2h&oddsFormat=decimal&bookmakers=${BETFAIR_KEYS.join(',')}`,
    )
    if (res.status === 401) return _mock('Invalid API key — check it and re-enter')
    if (!res.ok)            return _mock(`API error ${res.status}`)

    const data = await res.json()
    const matches = (Array.isArray(data) ? data : [])
      .map(normalize)
      .filter(Boolean)
      .map(m => ({ ...m, arbitrage: calcArbitrage(m) }))

    return matches.length > 0
      ? { matches, isMock: false, error: null }
      : _mock('No live IPL matches on Betfair right now — showing demo data')
  } catch {
    return _mock('Network error')
  }
}

function _mock(error) {
  const matches = MOCK_MATCHES.map(m => ({ ...m, arbitrage: calcArbitrage(m) }))
  return { matches, isMock: true, error }
}
