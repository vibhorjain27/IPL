import { useState } from 'react'
import dayjs from 'dayjs'

export default function Portfolio({ bets, stats, matches, onSettle }) {
  const [settling, setSettling] = useState(null)

  const pending = bets.filter(b => b.status === 'pending')
  const settled = bets.filter(b => b.status !== 'pending')

  const byMatch = {}
  pending.forEach(b => {
    if (!byMatch[b.matchId]) byMatch[b.matchId] = { name: b.matchName, bets: [] }
    byMatch[b.matchId].bets.push(b)
  })

  const handleSettle = (matchId, winner) => {
    setSettling(matchId + winner)
    try { onSettle(matchId, winner) } finally { setSettling(null) }
  }

  const pnlColor = stats.netPnl >= 0 ? 'text-green-400' : 'text-red-400'

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Net P&L',      value: `${stats.netPnl >= 0 ? '+' : ''}₹${stats.netPnl.toLocaleString()}`, color: pnlColor },
          { label: 'Open bets',    value: stats.pendingCount,  color: 'text-blue-300' },
          { label: 'At risk',      value: `₹${stats.pendingExposure.toLocaleString()}`, color: 'text-yellow-300' },
          { label: 'Win rate',     value: `${stats.winRate}%`, color: stats.winRate >= 50 ? 'text-green-400' : 'text-red-400' },
        ].map(s => (
          <div key={s.label} className="bg-ipl-card border border-ipl-border rounded-xl p-4">
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className={`text-xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Open bets */}
      {Object.entries(byMatch).length > 0 && (
        <div className="bg-ipl-card border border-ipl-border rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-ipl-border flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse inline-block" />
            <h3 className="font-semibold text-white">Open Bets</h3>
          </div>
          <div className="divide-y divide-ipl-border">
            {Object.entries(byMatch).map(([matchId, { name, bets: mBets }]) => {
              const matchObj = matches.find(m => m.id === matchId)
              const teams    = matchObj
                ? matchObj.teams.map(t => t.name)
                : [...new Set(mBets.map(b => b.team))]
              const exposure = mBets.reduce((s, b) => s + (b.betType === 'lay' ? b.liability : b.stake), 0)

              return (
                <div key={matchId} className="p-5">
                  <div className="flex items-start justify-between mb-3 gap-4">
                    <div>
                      <p className="font-medium text-white text-sm">{name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {mBets.length} bet{mBets.length > 1 ? 's' : ''} · ₹{exposure.toFixed(2)} at risk
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 shrink-0">
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
                    {mBets.map(b => {
                      const isLay    = b.betType === 'lay'
                      const atRisk   = isLay ? b.liability : b.stake
                      const ifWin    = isLay ? b.stake : (b.odds - 1) * b.stake
                      const winLabel = isLay ? `if ${b.team} loses` : `if ${b.team} wins`

                      return (
                        <div key={b.id} className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm border ${
                          isLay ? 'bg-pink-950/20 border-pink-900' : 'bg-sky-950/20 border-sky-900'
                        }`}>
                          <div>
                            <span className={`text-xs font-bold px-1.5 py-0.5 rounded mr-2 ${
                              isLay ? 'bg-pink-700 text-white' : 'bg-sky-700 text-white'
                            }`}>
                              {isLay ? 'LAY' : 'BACK'}
                            </span>
                            <span className="text-white font-medium">{b.team}</span>
                            <span className="text-gray-500 text-xs ml-2">@ {b.odds.toFixed(2)}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-yellow-300 font-medium">₹{atRisk.toFixed(2)} risk</span>
                            <span className="text-green-400 text-xs ml-1">→ +₹{ifWin.toFixed(2)} {winLabel}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* History */}
      {settled.length > 0 && (
        <div className="bg-ipl-card border border-ipl-border rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-ipl-border">
            <h3 className="font-semibold text-white">History ({settled.length})</h3>
          </div>
          <div className="divide-y divide-ipl-border max-h-96 overflow-y-auto scrollbar-hide">
            {settled.map(b => {
              const isLay  = b.betType === 'lay'
              const cost   = isLay ? b.liability : b.stake
              const pnl    = b.status === 'won' ? b.payout - cost : -cost
              return (
                <div key={b.id} className="px-5 py-3 flex items-center justify-between text-sm">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                        b.status === 'won' ? 'bg-green-700/40 text-green-300' : 'bg-red-700/30 text-red-400'
                      }`}>{b.status.toUpperCase()}</span>
                      <span className={`text-xs px-1.5 rounded ${isLay ? 'bg-pink-900 text-pink-300' : 'bg-sky-900 text-sky-300'}`}>
                        {isLay ? 'LAY' : 'BACK'}
                      </span>
                      <span className="text-white font-medium">{b.team}</span>
                      <span className="text-gray-500">@ {b.odds.toFixed(2)}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {b.matchName} · {dayjs(b.settledAt).format('D MMM HH:mm')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {pnl >= 0 ? '+' : ''}₹{pnl.toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500">₹{cost.toFixed(2)} risked</p>
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
          <p>No bets yet — go to Matches &amp; Odds to place your first back or lay.</p>
        </div>
      )}
    </div>
  )
}
