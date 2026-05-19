import { useState, useEffect } from 'react'

export default function BookBalancer({ matches, initialMatch, getBook }) {
  const [selectedId, setSelectedId] = useState(initialMatch?.id ?? matches[0]?.id ?? null)

  useEffect(() => {
    if (initialMatch) setSelectedId(initialMatch.id)
  }, [initialMatch])

  const match = matches.find(m => m.id === selectedId)
  const teams = match ? [match.home_team, match.away_team] : []
  const { book, totalStaked, pending } = getBook(selectedId, teams)

  const entries    = Object.entries(book)
  const pnls       = entries.map(([, v]) => v.pnlIfWins)
  const spread     = pnls.length >= 2 ? Math.max(...pnls) - Math.min(...pnls) : 0
  const isBalanced = spread < 50
  const worstTeam  = entries.length >= 2
    ? entries.reduce((a, b) => a[1].pnlIfWins < b[1].pnlIfWins ? a : b)[0]
    : null

  return (
    <div className="space-y-5">
      {/* Match picker */}
      <div className="bg-ipl-card border border-ipl-border rounded-2xl p-5">
        <h2 className="font-semibold text-white mb-3">Select Match</h2>
        <div className="flex flex-wrap gap-2">
          {matches.map(m => (
            <button
              key={m.id}
              onClick={() => setSelectedId(m.id)}
              className={`px-4 py-2 rounded-xl text-sm border transition-all ${
                selectedId === m.id
                  ? 'bg-blue-600 border-blue-500 text-white'
                  : 'bg-ipl-dark border-ipl-border text-gray-400 hover:text-white hover:border-blue-800'
              }`}
            >
              {m.home_team.split(' ').pop()} vs {m.away_team.split(' ').pop()}
            </button>
          ))}
        </div>
      </div>

      {pending.length === 0 ? (
        <div className="text-center py-16 text-gray-600">
          <div className="text-4xl mb-3">📊</div>
          <p>No open bets for this match.</p>
          <p className="text-xs mt-1">Place bets from the Matches tab then check your book here.</p>
        </div>
      ) : (
        <>
          {/* Balance status */}
          <div className={`rounded-2xl border p-5 ${isBalanced ? 'bg-green-950/30 border-green-800' : 'bg-yellow-950/20 border-yellow-800'}`}>
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-semibold text-white">
                {isBalanced ? '✅ Book is balanced' : '⚠️ Book is unbalanced'}
              </h3>
              <span className="text-xs text-gray-400">Total staked: ₹{totalStaked.toLocaleString()}</span>
            </div>
            <p className="text-xs text-gray-400">
              {isBalanced
                ? `P&L spread ₹${spread.toFixed(0)} — you're nearly neutral on this match.`
                : `P&L spread ₹${spread.toFixed(0)} — most exposed on ${worstTeam} winning. Bet more on that side to reduce risk.`}
            </p>
          </div>

          {/* Outcome cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {teams.map(team => {
              const data = book[team]
              const pnl  = data?.pnlIfWins ?? 0
              const maxAbs = Math.max(...entries.map(([,v]) => Math.abs(v.pnlIfWins)), 1)
              const barPct = Math.min(100, (Math.abs(pnl) / maxAbs) * 100)

              return (
                <div key={team} className={`bg-ipl-card rounded-2xl border p-5 ${
                  !data ? 'border-ipl-border opacity-60'
                  : pnl >= 0 ? 'border-green-800' : 'border-red-800'
                }`}>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-white truncate">{team}</h4>
                    <span className={`text-xs font-bold ${pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {pnl >= 0 ? '+' : ''}₹{pnl.toFixed(2)}
                    </span>
                  </div>

                  {!data || data.bets.length === 0 ? (
                    <p className="text-xs text-gray-600">No bets on this outcome yet.</p>
                  ) : (
                    <>
                      <div className="space-y-1.5 text-sm mb-3">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Bets backing them</span>
                          <span className="text-white">{data.bets.length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Total stake on them</span>
                          <span className="text-white">₹{data.totalStake.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Liability if they win</span>
                          <span className="text-red-400">₹{data.totalPayout.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between border-t border-ipl-border pt-2">
                          <span className="text-gray-300 font-medium">Net P&L if they win</span>
                          <span className={`font-bold ${pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {pnl >= 0 ? '+' : ''}₹{pnl.toFixed(2)}
                          </span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-ipl-dark rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${pnl >= 0 ? 'bg-green-500' : 'bg-red-500'}`}
                          style={{ width: `${barPct}%` }}
                        />
                      </div>
                      <div className="mt-2 space-y-0.5">
                        {data.bets.map(b => (
                          <div key={b.id} className="flex justify-between text-xs text-gray-500">
                            <span>@ {b.bookmaker} · {b.odds.toFixed(2)}</span>
                            <span>₹{b.stake.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>

          {!isBalanced && worstTeam && (
            <div className="bg-blue-950/30 border border-blue-800 rounded-xl p-4 text-sm">
              <p className="text-blue-300 font-semibold mb-1">💡 Rebalancing tip</p>
              <p className="text-blue-400 text-xs">
                You lose most if <strong>{worstTeam}</strong> wins (P&L: ₹{book[worstTeam]?.pnlIfWins?.toFixed(2)}).
                Bet more on <strong>{worstTeam}</strong> at the best available odds to reduce that exposure —
                or hedge by laying the favourite on an exchange.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
