// Fetches real IPL match schedule + odds from The Odds API.
// Uses any available bookmaker (not Betfair-only) since Betfair exchange
// data for cricket isn't always in the free tier.
// Lay prices are simulated with a realistic exchange spread on top of back odds.

const BASE   = 'https://api.the-odds-api.com/v4'
// Try IPL-specific key first, fall back to general cricket
const SPORT_KEYS = ['cricket_ipl', 'cricket']

function layOdds(back) {
  if (back < 1.5)  return +(back + 0.01).toFixed(2)
  if (back < 2.0)  return +(back + 0.02).toFixed(2)
  if (back < 3.0)  return +(back + 0.04).toFixed(2)
  if (back < 5.0)  return +(back + 0.10).toFixed(2)
  return +(back + 0.20).toFixed(2)
}

// ---------------------------------------------------------------------------
// Mock data — shown when API key missing or no live matches found
// ---------------------------------------------------------------------------
export const MOCK_MATCHES = [
  {
    id: 'mock_mi_csk',
    home_team: 'Mumbai Indians',
    away_team: 'Chennai Super Kings',
    commence_time: new Date(Date.now() + 2 * 3600_000).toISOString(),
    source: 'Demo',
    teams: [
      { name: 'Mumbai Indians',      back: 1.90, lay: layOdds(1.90) },
      { name: 'Chennai Super Kings', back: 2.12, lay: layOdds(2.12) },
    ],
  },
  {
    id: 'mock_rcb_kkr',
    home_team: 'Royal Challengers Bangalore',
    away_team: 'Kolkata Knight Riders',
    commence_time: new Date(Date.now() + 6 * 3600_000).toISOString(),
    source: 'Demo',
    teams: [
      { name: 'Royal Challengers Bangalore', back: 2.28, lay: layOdds(2.28) },
      { name: 'Kolkata Knight Riders',       back: 1.72, lay: layOdds(1.72) },
    ],
  },
]

// ---------------------------------------------------------------------------
// Normalize a raw Odds API event → our internal format
// Takes the bookmaker with the most outcomes (most complete data)
// ---------------------------------------------------------------------------
function normalize(raw) {
  if (!raw.bookmakers?.length) return null

  // Prefer bookmakers in this order; fall back to first available
  const PREFERRED = ['betfair_ex_best_odds', 'betfair_sb', 'pinnacle', 'bet365']
  const bm =
    PREFERRED.reduce((found, key) =>
      found || raw.bookmakers.find(b => b.key === key), null)
    ?? raw.bookmakers[0]

  const h2h = bm?.markets?.find(m => m.key === 'h2h')
  if (!h2h || h2h.outcomes.length < 2) return null

  const teams = h2h.outcomes.map(o => ({
    name: o.name,
    back: o.price,
    lay:  layOdds(o.price),
  }))

  return {
    id:            raw.id,
    home_team:     raw.home_team,
    away_team:     raw.away_team,
    commence_time: raw.commence_time,
    source:        bm.title,
    teams,
  }
}

// ---------------------------------------------------------------------------
// Arbitrage: back both teams — arb if 1/back_A + 1/back_B < 1
// ---------------------------------------------------------------------------
export function calcArbitrage(match) {
  const { teams } = match
  if (!teams || teams.length < 2) return null

  const arbPct = teams.reduce((s, t) => s + 1 / t.back, 0)
  const isArb  = arbPct < 1
  const profit = isArb ? +((1 - arbPct) * 100).toFixed(2) : null
  const margin = +((arbPct - 1) * 100).toFixed(2)

  let optimalStakes = null
  if (isArb) {
    const ret = 1000 / arbPct
    optimalStakes = {}
    for (const t of teams) {
      optimalStakes[t.name] = {
        stake: +(ret / t.back).toFixed(2),
        guaranteedReturn: +ret.toFixed(2),
        back: t.back,
      }
    }
  }

  return {
    arbPct:        +(arbPct * 100).toFixed(2),
    isArb,
    bookmarginPct: isArb ? null : margin,
    profitPct:     profit,
    optimalStakes,
  }
}

// ---------------------------------------------------------------------------
// Fetch — tries cricket_ipl then cricket, returns first non-empty result
// ---------------------------------------------------------------------------
export async function fetchOdds(apiKey) {
  if (!apiKey) return _mock(null)

  for (const sport of SPORT_KEYS) {
    try {
      const res = await fetch(
        `${BASE}/sports/${sport}/odds?` +
        `apiKey=${encodeURIComponent(apiKey)}` +
        `&regions=uk,eu,au,us` +
        `&markets=h2h` +
        `&oddsFormat=decimal`,
      )

      if (res.status === 401) return _mock('Invalid API key — re-enter it')
      if (res.status === 422) continue   // sport not found, try next
      if (!res.ok) continue

      const data = await res.json()
      if (!Array.isArray(data) || data.length === 0) continue

      const matches = data
        .map(normalize)
        .filter(Boolean)
        .map(m => ({ ...m, arbitrage: calcArbitrage(m) }))

      if (matches.length > 0) {
        return { matches, isMock: false, error: null }
      }
    } catch {
      // network error — try next sport key
    }
  }

  return _mock('No live IPL matches found on The Odds API right now — showing demo data')
}

function _mock(error) {
  const matches = MOCK_MATCHES.map(m => ({ ...m, arbitrage: calcArbitrage(m) }))
  return { matches, isMock: true, error }
}
