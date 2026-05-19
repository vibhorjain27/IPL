import { useState } from 'react'

const QUICK = [100, 250, 500, 1000, 2000]

export default function BetModal({ match, team, bookmaker, odds, wallet, onConfirm, onClose }) {
  const [stake, setStake] = useState('')
  const [error, setError] = useState('')

  const stakeNum = parseFloat(stake) || 0
  const payout   = stakeNum > 0 ? (stakeNum * odds).toFixed(2) : '—'
  const profit   = stakeNum > 0 ? ((stakeNum * odds) - stakeNum).toFixed(2) : '—'

  const submit = () => {
    if (!stakeNum || stakeNum <= 0) return setError('Enter a valid stake')
    if (stakeNum > wallet)          return setError(`Max: ₹${wallet.toLocaleString()}`)
    try {
      onConfirm({
        matchId:   match.id,
        matchName: `${match.home_team} vs ${match.away_team}`,
        team, bookmaker, odds, stake: stakeNum,
      })
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div className="bg-ipl-card border border-ipl-border rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-ipl-border">
          <div>
            <h2 className="font-bold text-white">Place Bet</h2>
            <p className="text-xs text-gray-500 mt-0.5">{match.home_team} vs {match.away_team}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl">✕</button>
        </div>

        <div className="p-5 space-y-4">
          <div className="bg-ipl-dark rounded-xl p-4 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-400">Selection</span><span className="text-white font-semibold">{team}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Bookmaker</span><span className="text-gray-300">{bookmaker}</span></div>
            <div className="flex justify-between"><span className="text-gray-400">Odds</span><span className="text-green-400 font-bold text-lg">{odds.toFixed(2)}</span></div>
          </div>

          <div>
            <p className="text-xs text-gray-500 mb-2">Quick stake</p>
            <div className="flex flex-wrap gap-2">
              {QUICK.filter(s => s <= wallet).map(s => (
                <button
                  key={s}
                  onClick={() => { setStake(String(s)); setError('') }}
                  className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${
                    stake === String(s)
                      ? 'bg-blue-600 border-blue-500 text-white'
                      : 'bg-ipl-dark border-ipl-border text-gray-300 hover:border-blue-700'
                  }`}
                >
                  ₹{s.toLocaleString()}
                </button>
              ))}
              <button
                onClick={() => { setStake(String(wallet)); setError('') }}
                className="px-3 py-1.5 rounded-lg text-sm border border-ipl-border bg-ipl-dark text-gray-300 hover:border-blue-700"
              >
                All in
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500 mb-1 block">Custom stake (₹)</label>
            <input
              type="number"
              value={stake}
              onChange={e => { setStake(e.target.value); setError('') }}
              onKeyDown={e => e.key === 'Enter' && submit()}
              placeholder={`Max ₹${wallet.toLocaleString()}`}
              min={1} max={wallet}
              className="w-full bg-ipl-dark border border-ipl-border rounded-xl px-4 py-3 text-white
                         placeholder-gray-600 focus:outline-none focus:border-blue-600 text-lg font-mono"
            />
          </div>

          <div className="bg-ipl-dark rounded-xl p-4 grid grid-cols-3 gap-4 text-center">
            <div><p className="text-xs text-gray-500">Stake</p><p className="font-bold text-white">₹{stakeNum || '—'}</p></div>
            <div><p className="text-xs text-gray-500">Payout</p><p className="font-bold text-blue-300">₹{payout}</p></div>
            <div><p className="text-xs text-gray-500">Profit</p><p className="font-bold text-green-400">₹{profit}</p></div>
          </div>

          {error && <p className="text-red-400 text-sm text-center">{error}</p>}

          <button
            onClick={submit}
            disabled={!stakeNum}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed
                       text-white font-bold py-3.5 rounded-xl transition-colors"
          >
            Place Bet — ₹{stakeNum ? stakeNum.toLocaleString() : '0'}
          </button>

          <p className="text-center text-xs text-gray-600">Virtual money only · no real funds</p>
        </div>
      </div>
    </div>
  )
}
