// Displays a grid of odds per bookmaker with best-odds highlighting
export default function OddsTable({ bookmakers, homeTeam, awayTeam, onBet, wallet }) {
  const teams = [homeTeam, awayTeam]

  // Find best price per team
  const bestPrice = {}
  teams.forEach(t => { bestPrice[t] = 0 })
  bookmakers.forEach(bm => {
    bm.markets?.forEach(mkt => {
      if (mkt.key !== 'h2h') return
      mkt.outcomes?.forEach(o => {
        if (o.price > (bestPrice[o.name] ?? 0)) bestPrice[o.name] = o.price
      })
    })
  })

  // Index odds by bookmaker + team
  const oddsMap = {}
  bookmakers.forEach(bm => {
    oddsMap[bm.key] = {}
    bm.markets?.forEach(mkt => {
      if (mkt.key !== 'h2h') return
      mkt.outcomes?.forEach(o => { oddsMap[bm.key][o.name] = o.price })
    })
  })

  return (
    <div className="overflow-x-auto scrollbar-hide">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-gray-500 border-b border-ipl-border">
            <th className="pb-2 pr-4 font-medium w-32">Bookmaker</th>
            {teams.map(t => (
              <th key={t} className="pb-2 px-3 font-medium text-center">{t}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {bookmakers.map(bm => (
            <tr key={bm.key} className="border-b border-ipl-border/50 last:border-0 hover:bg-white/5">
              <td className="py-2 pr-4 text-gray-400 text-xs font-medium">{bm.title}</td>
              {teams.map(team => {
                const price = oddsMap[bm.key]?.[team]
                const isBest = price && price >= bestPrice[team]
                return (
                  <td key={team} className="py-2 px-3 text-center">
                    {price ? (
                      <button
                        onClick={() => onBet(team, bm.title, price)}
                        disabled={!wallet || wallet <= 0}
                        className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                          isBest
                            ? 'bg-green-600/20 text-green-300 border border-green-700 hover:bg-green-600/40'
                            : 'bg-ipl-dark text-gray-300 border border-ipl-border hover:bg-white/10'
                        } disabled:opacity-40 disabled:cursor-not-allowed`}
                      >
                        {price.toFixed(2)}
                        {isBest && <span className="ml-1 text-[10px] text-green-400">▲BEST</span>}
                      </button>
                    ) : (
                      <span className="text-gray-600">—</span>
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-gray-600 mt-2">Click any odds to place a virtual bet · Green = best available price</p>
    </div>
  )
}
