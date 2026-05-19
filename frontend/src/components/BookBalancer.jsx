import { useState, useEffect } from 'react'

export default function BookBalancer({ matches, initialMatch, getBook }) {
  const [selectedId, setSelectedId] = useState(initialMatch?.id ?? matches[0]?.id ?? null)

  useEffect(() => { if (initialMatch) setSelectedId(initialMatch.id) }, [initialMatch])

  const match = matches.find(m => m.id === selectedId)
  const teams = match ? match.teams.map(t => t.name) : []
  const { pnlIfWins, pending, totalExposure } = getBook(selectedId, teams)

  const pnls      = Object.values(pnlIfWins)
  const spread    = pnls.length >= 2 ? Math.max(...pnls) - Math.min(...pnls) : 0
  const isBalanced = spread < 50
  const worstTeam  = teams.length >= 2
    ? teams.reduce((a, b) => (pnlIfWins[a] ?? 0) < (pnlIfWins[b] ?? 0) ? a : b)
    : null
  const bestTeam   = teams.length >= 2
    ? teams.reduce((a, b) => (pnlIfWins[a] ?? 0) > (pnlIfWins[b] ?? 0) ? a : b)
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
          <p className="text-xs mt-1">Place backs and lays from the Matches tab, then see your book here.</p>
        </div>
      ) : (
        <>
          {/* Balance status */}
          <div className={`rounded-2xl border p-5 ${isBalanced ? 'bg-green-950/30 border-green-800' : 'bg-yellow-950/20 border-yellow-800'}`}>
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-semibold text-white">
                {isBalanced ? '✅ Book is balanced' : '⚠️ Book is unbalanced'}
              </h3>
              <span className="text-xs text-gray-400">Total exposure: ₹{totalExposure.toLocaleString()}</span>
            </div>
            <p className="text-xs text-gray-400">
              {isBalanced
                ? `Max P&L swing is only ₹${spread.toFixed(0)} — nearly neutral.`
                : `P&L swing of ₹${spread.toFixed(0)} — worst case if ${worstTeam} wins. Back or lay to rebalance.`}
            </p>
          </div>

          {/* Outcome P&L cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {teams.map(team => {
              const pnl    = pnlIfWins[team] ?? 0
              const maxAbs = Math.max(...Object.values(pnlIfWins).map(Math.abs), 1)
              const barPct = Math.min(100, (Math.abs(pnl) / maxAbs) * 100)
              const isBest  = team === bestTeam
              const isWorst = team === worstTeam

              // Bets on this team
              const backs = pending.filter(b => b.betType === 'back' && b.team === team)
              const lays  = pending.filter(b => b.betType === 'lay'  && b.team === team)

              return (
                <div key={team} className={`bg-ipl-card rounded-2xl border p-5 ${
                  isBest ? 'border-green-800' : isWorst ? 'border-red-800' : 'border-ipl-border'
                }`}>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-white truncate">{team}</h4>
                    <div className="flex items-center gap-2">
                      {isBest  && <span className="text-xs bg-green-800 text-green-300 px-2 py-0.5 rounded-full">Best</span>}
                      {isWorst && <span className="text-xs bg-red-900 text-red-400 px-2 py-0.5 rounded-full">Worst</span>}
                      <span className={`font-bold text-base ${pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {pnl >= 0 ? '+' : ''}₹{pnl.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-gray-500 mb-3">Net P&L if {team.split(' ').pop()} wins</p>

                  {/* P&L bar */}
                  <div className="h-2 bg-ipl-dark rounded-full overflow-hidden mb-3">
                    <div
                      className={`h-full rounded-full ${pnl >= 0 ? 'bg-green-500' : 'bg-red-500'}`}
                      style={{ width: `${barPct}%` }}
                    />
                  </div>

                  {/* Breakdown */}
                  <div className="space-y-1">
                    {backs.map(b => (
                      <div key={b.id} className="flex justify-between text-xs text-sky-400">
                        <span>BACK @ {b.odds.toFixed(2)}</span>
                        <span>+₹{((b.odds-1)*b.stake).toFixed(2)} if wins / −₹{b.stake.toFixed(2)} if loses</span>
                      </div>
                    ))}
                    {lays.map(b => (
                      <div key={b.id} className="flex justify-between text-xs text-pink-400">
                        <span>LAY @ {b.odds.toFixed(2)}</span>
                        <span>−₹{b.liability.toFixed(2)} if wins / +₹{b.stake.toFixed(2)} if loses</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Rebalance tip */}
          {!isBalanced && worstTeam && (
            <div className="bg-blue-950/30 border border-blue-800 rounded-xl p-4 text-sm">
              <p className="text-blue-300 font-semibold mb-1">💡 Rebalancing tip</p>
              <p className="text-blue-400 text-xs">
                If <strong>{worstTeam}</strong> wins your P&L is ₹{(pnlIfWins[worstTeam] ?? 0).toFixed(2)}.
                To reduce exposure: <strong>Back {worstTeam}</strong> (more upside if they win)
                or <strong>Lay {bestTeam}</strong> (reduces liability on the other side).
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
