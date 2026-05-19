import { useState } from 'react'
import { resetWallet } from '../api'
import dayjs from 'dayjs'

export default function Header({ wallet, isMock, lastRefresh, onReset, pendingBets }) {
  const [resetting, setResetting] = useState(false)

  const handleReset = async () => {
    if (!confirm('Reset wallet to ₹10,000 and clear all bets?')) return
    setResetting(true)
    try {
      await resetWallet()
      await onReset()
    } finally {
      setResetting(false)
    }
  }

  return (
    <header className="bg-ipl-card border-b border-ipl-border sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <span className="text-2xl">🏏</span>
          <div>
            <h1 className="font-bold text-white leading-none">IPL Betting Simulator</h1>
            <p className="text-xs text-gray-500 leading-none mt-0.5">
              {isMock ? '🟡 Demo odds' : '🟢 Live odds'}&nbsp;·&nbsp;
              {lastRefresh ? `Updated ${dayjs(lastRefresh).format('HH:mm:ss')}` : 'Fetching…'}
            </p>
          </div>
        </div>

        {/* Wallet */}
        <div className="flex items-center gap-3">
          {pendingBets > 0 && (
            <span className="bg-blue-600/20 text-blue-300 border border-blue-700 text-xs px-2 py-1 rounded-full">
              {pendingBets} open {pendingBets === 1 ? 'bet' : 'bets'}
            </span>
          )}
          <div className="bg-ipl-dark border border-ipl-border rounded-xl px-4 py-2 text-right">
            <p className="text-xs text-gray-500 leading-none">Virtual Balance</p>
            <p className={`font-bold text-lg leading-none mt-0.5 ${
              wallet !== null && wallet < 1000 ? 'text-red-400' : 'text-green-400'
            }`}>
              ₹{wallet !== null ? wallet.toLocaleString('en-IN', { maximumFractionDigits: 2 }) : '—'}
            </p>
          </div>
          <button
            onClick={handleReset}
            disabled={resetting}
            className="text-xs text-gray-500 hover:text-red-400 transition-colors px-2 py-1 rounded border border-transparent hover:border-red-800"
          >
            {resetting ? '…' : 'Reset'}
          </button>
        </div>
      </div>
    </header>
  )
}
