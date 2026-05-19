import { useState, useEffect, useCallback } from 'react'
import { fetchBook } from '../api'

// The book balancer shows your net exposure per outcome.
// A balanced book means you profit (or break even) regardless of which team wins.
export default function BookBalancer({ matches, initialMatch }) {
  const [selectedMatchId, setSelectedMatchId] = useState(initialMatch?.id ?? matches[0]?.id ?? null)
  const [book, setBook]   = useState(null)
  const [loading, setLoading] = useState(false)

  const loadBook = useCallback(async (matchId) => {
    if (!matchId) return
    setLoading(true)
    try {
      const data = await fetchBook(matchId)
      setBook(data)
    } catch {
      setBook(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (initialMatch) setSelectedMatchId(initialMatch.id)
  }, [initialMatch])

  useEffect(() => {
    loadBook(selectedMatchId)
  }, [selectedMatchId, loadBook])

  const selectedMatch = matches.find(m => m.id === selectedMatchId)
  const teams = selectedMatch
    ? [selectedMatch.home_team, selectedMatch.away_team]
    : []

  const bookEntries = book?.book ? Object.entries(book.book) : []
  const totalStaked = book?.total_staked ?? 0

  // Determine best and worst outcomes
  let bestOutcome  = null
  let worstOutcome = null
  if (bookEntries.length >= 2) {
    bestOutcome  = bookEntries.reduce((a, b) => a[1].pnl_if_wins > b[1].pnl_if_wins ? a : b)[0]
    worstOutcome = bookEntries.reduce((a, b) => a[1].pnl_if_wins < b[1].pnl_if_wins ? a : b)[0]
  }

  // How balanced is the book? (closer to 0 spread = more balanced)
  const pnls = bookEntries.map(([, v]) => v.pnl_if_wins)
  const spread = pnls.length >= 2 ? Math.max(...pnls) - Math.min(...pnls) : 0
  const isBalanced = spread < 50  // within ₹50 either way

  return (
    <div className="space-y-5">
      {/* Match selector */}
      <div className="bg-ipl-card border border-ipl-border rounded-2xl p-5">
        <h2 className="font-semibold text-white mb-3">Select Match</h2>
        <div className="flex flex-wrap gap-2">
          {matches.map(m => (
            <button
              key={m.id}
              onClick={() => setSelectedMatchId(m.id)}
              className={`px-4 py-2 rounded-xl text-sm border transition-all ${
                selectedMatchId === m.id
                  ? 'bg-blue-600 border-blue-500 text-white'
                  : 'bg-ipl-dark border-ipl-border text-gray-400 hover:text-white hover:border-blue-800'
              }`}
            >
              {m.home_team.split(' ').pop()} vs {m.away_team.split(' ').pop()}
            </button>
          ))}
        </div>
      </div>

      {/* Book display */}
      {loading && (
        <div className="text-center py-10 text-gray-500">Loading book...</div>
      )}

      {!loading && book && (
        <>
          {/* Balance indicator */}
          <div className={`rounded-2xl border p-5 ${
            isBalanced
              ? 'bg-green-950/30 border-green-800'
              : 'bg-yellow-950/20 border-yellow-800'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-white">
                {isBalanced ? '✅ Book is balanced' : '⚠️ Book is unbalanced'}
              </h3>
              <span className="text-xs text-gray-400">Total staked: ₹{totalStaked.toLocaleString()}</span>
            </div>
            <p className="text-xs text-gray-400">
              {isBalanced
                ? `P&L spread is only ₹${spread.toFixed(0)} — you're nearly neutral.`
                : `P&L spread is ₹${spread.toFixed(0)} — you're overexposed on ${worstOutcome}. Add bets on the other side to rebalance.`}
            </p>
          </div>

          {/* Outcome cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(teams.length > 0 ? teams : bookEntries.map(([t]) => t)).map(team => {
              const data = book.book[team]
              if (!data) {
                // No bets on this team yet
                return (
                  <div key={team} className="bg-ipl-card border border-ipl-border rounded-2xl p-5">
                    <h4 className="font-semibold text-white mb-1 truncate">{team}</h4>
                    <p className="text-xs text-gray-600">No bets placed on this outcome yet.</p>
                    <p className="text-xs text-gray-500 mt-2">
                      If {team.split(' ').pop()} wins: <span className="text-green-400 font-mono">₹0 P&L</span>
                    </p>
                  </div>
                )
              }

              const pnl        = data.pnl_if_wins
              const isBest     = team === bestOutcome
              const isWorst    = team === worstOutcome
              const pnlColor   = pnl >= 0 ? 'text-green-400' : 'text-red-400'

              // Bar width for visualisation
              const maxPnl = Math.max(...bookEntries.map(([,v]) => Math.abs(v.pnl_if_wins)), 1)
              const barPct = Math.min(100, (Math.abs(pnl) / maxPnl) * 100)

              return (
                <div key={team} className={`bg-ipl-card border rounded-2xl p-5 ${
                  isBest ? 'border-green-700' : isWorst ? 'border-red-800' : 'border-ipl-border'
                }`}>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-white truncate">{team}</h4>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      isBest ? 'bg-green-800 text-green-300' : isWorst ? 'bg-red-900 text-red-400' : 'bg-gray-800 text-gray-400'
                    }`}>
                      {isBest ? 'Best outcome' : isWorst ? 'Most exposed' : ''}
                    </span>
                  </div>

                  <div className="space-y-2 text-sm mb-4">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Bets on this team</span>
                      <span className="text-white">{data.bets.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Total staked on them</span>
                      <span className="text-white">₹{data.total_stake.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Liability if they win</span>
                      <span className="text-red-400">₹{data.total_payout.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between border-t border-ipl-border pt-2">
                      <span className="text-gray-300 font-medium">Net P&L if they win</span>
                      <span className={`font-bold text-base ${pnlColor}`}>
                        {pnl >= 0 ? '+' : ''}₹{pnl.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* P&L bar */}
                  <div className="h-2 bg-ipl-dark rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${pnl >= 0 ? 'bg-green-500' : 'bg-red-500'}`}
                      style={{ width: `${barPct}%` }}
                    />
                  </div>

                  {/* Individual bets */}
                  {data.bets.length > 0 && (
                    <div className="mt-3 space-y-1">
                      {data.bets.map(b => (
                        <div key={b.id} className="flex justify-between text-xs text-gray-500">
                          <span>@ {b.bookmaker} · {b.odds.toFixed(2)}</span>
                          <span>₹{b.stake.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Rebalancing tip */}
          {!isBalanced && bookEntries.length >= 2 && worstOutcome && (
            <div className="bg-blue-950/30 border border-blue-800 rounded-xl p-4 text-sm text-blue-300">
              <p className="font-semibold mb-1">💡 Rebalancing suggestion</p>
              <p className="text-blue-400 text-xs">
                You're more exposed if <strong>{worstOutcome}</strong> wins (P&L: ₹{book.book[worstOutcome]?.pnl_if_wins?.toFixed(2)}).
                Consider betting more on <strong>{worstOutcome}</strong> at good odds to reduce that exposure,
                or hedge by laying the favourite on an exchange.
              </p>
            </div>
          )}
        </>
      )}

      {!loading && book && bookEntries.length === 0 && totalStaked === 0 && (
        <div className="text-center py-16 text-gray-600">
          <div className="text-4xl mb-3">📊</div>
          <p>No open bets for this match yet.</p>
          <p className="text-xs mt-1">Place some bets from the Matches tab and come back here to see your book.</p>
        </div>
      )}
    </div>
  )
}
