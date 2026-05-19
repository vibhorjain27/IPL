// Shows arbitrage analysis for a match.
// Arbitrage exists when sum(1/odds) < 1 — guaranteed profit regardless of outcome.
export default function ArbitragePanel({ arbitrage, onBet }) {
  const { bestOdds: best_odds, arbPercentage: arb_percentage, isArbitrage: is_arbitrage, profitMargin: profit_margin, overRound: margin_over_round, optimalStakes: optimal_stakes } = arbitrage

  return (
    <div className={`rounded-xl border p-4 ${
      is_arbitrage
        ? 'bg-green-950/40 border-green-700'
        : 'bg-ipl-dark/60 border-ipl-border'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-base">{is_arbitrage ? '💰' : '📉'}</span>
          <h3 className="font-semibold text-sm text-white">
            {is_arbitrage ? 'Arbitrage Opportunity Detected!' : 'Odds Analysis'}
          </h3>
        </div>
        <div className={`text-xs font-bold px-2 py-1 rounded-full ${
          is_arbitrage
            ? 'bg-green-600 text-white'
            : 'bg-gray-700 text-gray-300'
        }`}>
          {arb_percentage}% book
        </div>
      </div>

      {/* Explanation */}
      <p className="text-xs text-gray-400 mb-3">
        {is_arbitrage
          ? `Book = ${arb_percentage}% → ${profit_margin}% guaranteed profit by splitting stakes across bookmakers`
          : `Book = ${arb_percentage}% (${margin_over_round}% over-round — bookmakers have a margin). No arb yet.`}
      </p>

      {/* Best odds per team */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        {Object.entries(best_odds).map(([team, info]) => (
          <div key={team} className="bg-black/20 rounded-lg p-3">
            <p className="text-xs text-gray-500 truncate">{team}</p>
            <p className="text-white font-bold text-lg">{info.odds.toFixed(2)}</p>
            <p className="text-xs text-gray-500">@ {info.bookmaker}</p>
            {is_arbitrage && (
              <button
                onClick={() => onBet(team, info.bookmaker, info.odds)}
                className="mt-2 w-full text-xs bg-green-700/40 hover:bg-green-700/70 border border-green-700 text-green-300 py-1 rounded transition-colors"
              >
                Bet ₹{optimal_stakes?.[team]?.stake?.toFixed(0)}
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Optimal stakes breakdown */}
      {is_arbitrage && optimal_stakes && (
        <div className="bg-green-900/20 border border-green-800 rounded-lg p-3 text-xs">
          <p className="text-green-300 font-semibold mb-1">Optimal split for ₹1,000 total:</p>
          {Object.entries(optimal_stakes).map(([team, s]) => (
            <div key={team} className="flex justify-between text-gray-300 py-0.5">
              <span className="truncate max-w-[60%]">{team} @ {s.bookmaker}</span>
              <span className="font-mono">₹{s.stake.toFixed(2)}</span>
            </div>
          ))}
          <div className="flex justify-between text-green-300 font-semibold border-t border-green-800 mt-1 pt-1">
            <span>Guaranteed return</span>
            <span>₹{Object.values(optimal_stakes)[0]?.guaranteed_return?.toFixed(2)}</span>
          </div>
        </div>
      )}

      {/* How-to note */}
      {!is_arbitrage && (
        <p className="text-xs text-gray-600 mt-1">
          Arb exists when the book is under 100%. Watch for odds movements — bookmakers occasionally diverge.
        </p>
      )}
    </div>
  )
}
