import { useState } from 'react'
import { settleBets } from '../api'
import dayjs from 'dayjs'

export default function Portfolio({ betsData, matches, onSettle }) {
  const [settling, setSettling] = useState(null)
  const [error, setError]       = useState('')

  if (!betsData) return null

  const { bets, stats } = betsData
  const pending  = bets.filter(b => b.status === 'pending')
  const settled  = bets.filter(b => b.status !== 'pending')

  // Group pending by match
  const byMatch = {}
  pending.forEach(b => {
    if (!byMatch[b.match_id]) byMatch[b.match_id] = { name: b.match_name, bets: [] }
    byMatch[b.match_id].bets.push(b)
  })

  const handleSettle = async (matchId, winner) => {
    setSettling(matchId + winner)
    setError('')
    try {
      await settleBets(matchId, winner)
      await onSettle()
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to settle')
    } finally {
      setSettling(null)
    }
  }

  const pnlColor = stats.net_pnl >= 0 ? 'text-green-400' : 'text-red-400'

  return (
    <div className="space-y-6">
      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Net P&L',       value: `${stats.net_pnl >= 0 ? '+' : ''}₹${stats.net_pnl.toLocaleString()}`, color: pnlColor },
          { label: 'Open bets',     value: stats.pending_count,  color: 'text-blue-300' },
          { label: 'Open stake',    value: `₹${stats.pending_stake.toLocaleString()}`, color: 'text-yellow-300' },
          { label: 'Win rate',      value: `${stats.win_rate}%`, color: stats.win_rate >= 50 ? 'text-green-400' : 'text-red-400' },
        ].map(s => (
          <div key={s.label} className="bg-ipl-card border border-ipl-border rounded-xl p-4">
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className={`text-xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Open bets — with settle controls */}
      {pending.length > 0 && (
        <div className="bg-ipl-card border border-ipl-border rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-ipl-border flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse inline-block"></span>
            <h3 className="font-semibold text-white">Open Bets</h3>
          </div>
          <div className="divide-y divide-ipl-border">
            {Object.entries(byMatch).map(([matchId, { name, bets: mBets }]) => {
              // Get unique teams for this match from the matches list
              const matchObj = matches.find(m => m.id === matchId)
              const teams = matchObj
                ? [matchObj.home_team, matchObj.away_team]
                : [...new Set(mBets.map(b => b.team))]

              return (
                <div key={matchId} className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-medium text-white text-sm">{name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{mBets.length} bet{mBets.length > 1 ? 's' : ''} · Total stake ₹{mBets.reduce((s,b)=>s+b.stake,0).toLocaleString()}</p>
                    </div>
                    {/* Settle buttons */}
                    <div className="flex gap-2 ml-4">
                      {teams.map(t => (
                        <button
                          key={t}
                          onClick={() => handleSettle(matchId, t)}
                          disabled={!!settling}
                          className="text-xs px-3 py-1.5 bg-green-700/30 hover:bg-green-700/60 border border-green-700 text-green-300 rounded-lg transition-colors disabled:opacity-50"
                        >
                          {settling === matchId + t ? '…' : `${t.split(' ').pop()} won`}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    {mBets.map(b => (
                      <div key={b.id} className="flex items-center justify-between bg-ipl-dark rounded-lg px-3 py-2 text-sm">
                        <div>
                          <span className="text-white font-medium">{b.team}</span>
                          <span className="text-gray-500 text-xs ml-2">@ {b.bookmaker} · {b.odds.toFixed(2)}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-yellow-300 font-medium">₹{b.stake.toLocaleString()}</span>
                          <span className="text-gray-500 text-xs ml-1">→ ₹{(b.stake * b.odds).toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
          {error && <p className="text-red-400 text-sm px-5 pb-4">{error}</p>}
        </div>
      )}

      {/* Settled bets history */}
      {settled.length > 0 && (
        <div className="bg-ipl-card border border-ipl-border rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-ipl-border">
            <h3 className="font-semibold text-white">Settled Bets ({settled.length})</h3>
          </div>
          <div className="divide-y divide-ipl-border max-h-96 overflow-y-auto scrollbar-hide">
            {settled.map(b => {
              const isWon   = b.status === 'won'
              const pnl     = isWon ? b.payout - b.stake : -b.stake
              return (
                <div key={b.id} className="px-5 py-3 flex items-center justify-between text-sm">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                        isWon ? 'bg-green-700/40 text-green-300' : 'bg-red-700/30 text-red-400'
                      }`}>
                        {isWon ? 'WON' : 'LOST'}
                      </span>
                      <span className="text-white font-medium">{b.team}</span>
                      <span className="text-gray-500">@ {b.odds.toFixed(2)}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {b.match_name} · {dayjs(b.settled_at).format('D MMM HH:mm')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {pnl >= 0 ? '+' : ''}₹{pnl.toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500">Staked ₹{b.stake.toLocaleString()}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {bets.length === 0 && (
        <div className="text-center py-20 text-gray-600">
          <div className="text-4xl mb-3">📋</div>
          <p>No bets yet. Head to Matches &amp; Odds to place your first bet.</p>
        </div>
      )}
    </div>
  )
}
