// Betfair-style exchange table: LAY (pink) | BACK (blue) for each team

export default function ExchangeTable({ teams, wallet, onBet }) {
  return (
    <div>
      {/* Header */}
      <div className="grid grid-cols-[1fr_140px_140px] gap-2 pb-2 border-b border-ipl-border text-xs text-gray-500 font-medium">
        <div>Selection</div>
        <div className="text-center text-pink-400">LAY (bet against)</div>
        <div className="text-center text-sky-400">BACK (bet for)</div>
      </div>

      {/* Rows */}
      <div className="divide-y divide-ipl-border/40">
        {teams.map(team => {
          const implied_back = (100 / team.back).toFixed(1)
          const implied_lay  = (100 / team.lay).toFixed(1)

          return (
            <div key={team.name} className="grid grid-cols-[1fr_140px_140px] gap-2 items-center py-3">
              {/* Team name + implied prob */}
              <div>
                <p className="text-white font-medium text-sm">{team.name}</p>
                <p className="text-gray-600 text-xs">Implied {implied_back}%</p>
              </div>

              {/* LAY button — pink */}
              <button
                onClick={() => onBet(team.name, 'lay', team.lay)}
                disabled={!wallet || wallet <= 0}
                className="flex flex-col items-center py-2 px-3 rounded-xl border border-pink-700
                           bg-pink-950/40 hover:bg-pink-900/60 transition-all
                           disabled:opacity-40 disabled:cursor-not-allowed group"
              >
                <span className="text-pink-300 font-bold text-lg leading-none">{team.lay.toFixed(2)}</span>
                <span className="text-pink-500 text-[10px] mt-0.5">LAY</span>
              </button>

              {/* BACK button — blue */}
              <button
                onClick={() => onBet(team.name, 'back', team.back)}
                disabled={!wallet || wallet <= 0}
                className="flex flex-col items-center py-2 px-3 rounded-xl border border-sky-700
                           bg-sky-950/40 hover:bg-sky-900/60 transition-all
                           disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span className="text-sky-300 font-bold text-lg leading-none">{team.back.toFixed(2)}</span>
                <span className="text-sky-500 text-[10px] mt-0.5">BACK</span>
              </button>
            </div>
          )
        })}
      </div>

      {/* Spread info */}
      <div className="mt-2 pt-2 border-t border-ipl-border/30 flex justify-between text-xs text-gray-600">
        <span>Lay &gt; Back always — the spread is Betfair's margin</span>
        <span>
          Spread: {teams.map(t => `${t.name.split(' ').pop()} ${((t.lay - t.back) / t.back * 100).toFixed(1)}%`).join(' · ')}
        </span>
      </div>
    </div>
  )
}
