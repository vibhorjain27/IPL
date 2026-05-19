import { useState } from 'react'

const QUICK = [100, 250, 500, 1000, 2000]

export default function BetModal({ match, team, betType, odds, wallet, onConfirm, onClose }) {
  const [stake, setStake] = useState('')
  const [error, setError] = useState('')

  const isLay    = betType === 'lay'
  const stakeNum = parseFloat(stake) || 0

  // Back: cost = stake, profit if win = (odds-1)*stake
  // Lay:  cost = liability = (odds-1)*stake, profit if win (selection loses) = stake
  const liability = isLay ? +((odds - 1) * stakeNum).toFixed(2) : 0
  const walletCost = isLay ? liability : stakeNum
  const profitIfWin = isLay
    ? stakeNum
    : +((odds - 1) * stakeNum).toFixed(2)
  const lossIfLose = isLay ? liability : stakeNum

  const maxStake = isLay
    ? +(wallet / (odds - 1)).toFixed(2)   // max backer stake where liability <= wallet
    : wallet

  const submit = () => {
    if (!stakeNum || stakeNum <= 0) return setError('Enter a valid stake')
    if (walletCost > wallet) return setError(`Insufficient balance — max stake ₹${maxStake.toLocaleString()}`)
    try {
      onConfirm({ matchId: match.id, matchName: `${match.home_team} vs ${match.away_team}`, team, betType, odds, stake: stakeNum })
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div className="bg-ipl-card border border-ipl-border rounded-2xl w-full max-w-md shadow-2xl">

        {/* Header */}
        <div className={`flex items-center justify-between px-5 py-4 border-b border-ipl-border rounded-t-2xl ${
          isLay ? 'bg-pink-950/40' : 'bg-sky-950/40'
        }`}>
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                isLay ? 'bg-pink-600 text-white' : 'bg-sky-600 text-white'
              }`}>
                {isLay ? 'LAY' : 'BACK'}
              </span>
              <h2 className="font-bold text-white">{team}</h2>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">{match.home_team} vs {match.away_team}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-xl">✕</button>
        </div>

        <div className="p-5 space-y-4">

          {/* Bet type explainer */}
          <div className={`rounded-xl p-3 text-xs ${isLay ? 'bg-pink-950/30 border border-pink-800 text-pink-300' : 'bg-sky-950/30 border border-sky-800 text-sky-300'}`}>
            {isLay
              ? `You're acting as the bookmaker. You're betting that ${team} will LOSE. Enter the stake you're willing to accept from the backer.`
              : `You're backing ${team} to WIN at ${odds}. If they win, you collect your stake × odds.`}
          </div>

          {/* Odds display */}
          <div className="bg-ipl-dark rounded-xl p-4 flex justify-between items-center">
            <span className="text-gray-400 text-sm">Odds</span>
            <span className={`font-bold text-2xl ${isLay ? 'text-pink-300' : 'text-sky-300'}`}>{odds.toFixed(2)}</span>
          </div>

          {/* Quick stake */}
          <div>
            <p className="text-xs text-gray-500 mb-2">
              {isLay ? 'Backer\'s stake you accept (₹)' : 'Your stake (₹)'}
            </p>
            <div className="flex flex-wrap gap-2">
              {QUICK.filter(s => (isLay ? (odds - 1) * s <= wallet : s <= wallet)).map(s => (
                <button
                  key={s}
                  onClick={() => { setStake(String(s)); setError('') }}
                  className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${
                    stake === String(s)
                      ? (isLay ? 'bg-pink-600 border-pink-500 text-white' : 'bg-sky-600 border-sky-500 text-white')
                      : 'bg-ipl-dark border-ipl-border text-gray-300 hover:border-blue-700'
                  }`}
                >
                  ₹{s.toLocaleString()}
                </button>
              ))}
              <button
                onClick={() => { setStake(String(maxStake)); setError('') }}
                className="px-3 py-1.5 rounded-lg text-sm border border-ipl-border bg-ipl-dark text-gray-300 hover:border-blue-700"
              >
                Max
              </button>
            </div>
          </div>

          {/* Custom stake input */}
          <input
            type="number"
            value={stake}
            onChange={e => { setStake(e.target.value); setError('') }}
            onKeyDown={e => e.key === 'Enter' && submit()}
            placeholder={`Max ₹${maxStake.toLocaleString()}`}
            min={1}
            className="w-full bg-ipl-dark border border-ipl-border rounded-xl px-4 py-3 text-white
                       placeholder-gray-600 focus:outline-none focus:border-blue-600 text-lg font-mono"
          />

          {/* P&L summary */}
          <div className="bg-ipl-dark rounded-xl p-4 space-y-2 text-sm">
            {isLay && (
              <div className="flex justify-between">
                <span className="text-gray-400">Your liability (wallet deducted)</span>
                <span className="text-red-400 font-bold">₹{stakeNum ? liability.toLocaleString() : '—'}</span>
              </div>
            )}
            {!isLay && (
              <div className="flex justify-between">
                <span className="text-gray-400">Stake (wallet deducted)</span>
                <span className="text-white font-bold">₹{stakeNum ? stakeNum.toLocaleString() : '—'}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-ipl-border pt-2">
              <span className="text-gray-300">
                {isLay ? `Profit if ${team} LOSES` : `Profit if ${team} WINS`}
              </span>
              <span className="text-green-400 font-bold">+₹{stakeNum ? profitIfWin.toFixed(2) : '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">
                {isLay ? `Loss if ${team} WINS` : `Loss if ${team} LOSES`}
              </span>
              <span className="text-red-400 font-bold">−₹{stakeNum ? lossIfLose.toFixed(2) : '—'}</span>
            </div>
          </div>

          {error && <p className="text-red-400 text-sm text-center">{error}</p>}

          <button
            onClick={submit}
            disabled={!stakeNum || walletCost > wallet}
            className={`w-full font-bold py-3.5 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-white ${
              isLay ? 'bg-pink-700 hover:bg-pink-600' : 'bg-sky-700 hover:bg-sky-600'
            }`}
          >
            {isLay
              ? `Lay ${team} — Liability ₹${stakeNum ? liability.toLocaleString() : '0'}`
              : `Back ${team} — Stake ₹${stakeNum ? stakeNum.toLocaleString() : '0'}`}
          </button>

          <p className="text-center text-xs text-gray-600">Virtual money only · no real funds</p>
        </div>
      </div>
    </div>
  )
}
