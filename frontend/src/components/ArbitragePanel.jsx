// Within-match arbitrage: back BOTH teams where 1/back_A + 1/back_B < 1

export default function ArbitragePanel({ arbitrage, onBet, teams }) {
  const { arbPct, isArb, bookmarginPct, profitPct, optimalStakes } = arbitrage

  return (
    <div className={`rounded-xl border p-4 ${
      isArb ? 'bg-green-950/40 border-green-700' : 'bg-ipl-dark/60 border-ipl-border'
    }`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span>{isArb ? '💰' : '📊'}</span>
          <h3 className="font-semibold text-sm text-white">
            {isArb ? 'Arb Detected — Back Both Sides' : 'Book Analysis'}
          </h3>
        </div>
        <div className={`text-xs font-bold px-2 py-1 rounded-full ${
          isArb ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-300'
        }`}>
          {arbPct}% book
        </div>
      </div>

      <p className="text-xs text-gray-400 mb-3">
        {isArb
          ? `Book ${arbPct}% → ${profitPct}% guaranteed profit by backing both teams at their current prices.`
          : `Book ${arbPct}% → Betfair has a ${bookmarginPct}% over-round. No arb right now.`}
      </p>

      {/* Team prices */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        {(teams || []).map(t => (
          <div key={t.name} className="bg-black/20 rounded-lg p-3">
            <p className="text-xs text-gray-500 truncate">{t.name}</p>
            <p className="text-sky-300 font-bold text-xl">{t.back.toFixed(2)}</p>
            <p className="text-xs text-gray-500">back · implied {(100/t.back).toFixed(1)}%</p>
            {isArb && optimalStakes?.[t.name] && (
              <button
                onClick={() => onBet(t.name, 'back', t.back)}
                className="mt-2 w-full text-xs bg-sky-700/40 hover:bg-sky-700/70 border border-sky-700 text-sky-300 py-1.5 rounded transition-colors"
              >
                Back ₹{optimalStakes[t.name].stake.toFixed(0)}
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Optimal stake table */}
      {isArb && optimalStakes && (
        <div className="bg-green-900/20 border border-green-800 rounded-lg p-3 text-xs">
          <p className="text-green-300 font-semibold mb-1">Optimal split for ₹1,000 guaranteed return:</p>
          {Object.entries(optimalStakes).map(([name, s]) => (
            <div key={name} className="flex justify-between text-gray-300 py-0.5">
              <span className="truncate max-w-[60%]">Back {name.split(' ').pop()} @ {s.back}</span>
              <span className="font-mono">₹{s.stake.toFixed(2)}</span>
            </div>
          ))}
          <div className="flex justify-between text-green-300 font-semibold border-t border-green-800 mt-1 pt-1">
            <span>Guaranteed return</span>
            <span>₹{Object.values(optimalStakes)[0]?.guaranteedReturn?.toFixed(2)}</span>
          </div>
        </div>
      )}

      {!isArb && (
        <p className="text-xs text-gray-600">
          Arb exists when book &lt;100%. Watch for price movements — Betfair odds shift as money comes in.
        </p>
      )}
    </div>
  )
}
