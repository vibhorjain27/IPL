import dayjs from 'dayjs'
import OddsTable from './OddsTable'
import ArbitragePanel from './ArbitragePanel'

export default function MatchCard({ match, wallet, onBet, onViewBook }) {
  const { home_team, away_team, commence_time, bookmakers, arbitrage } = match
  const kickoff = dayjs(commence_time)
  const isLive  = dayjs().isAfter(kickoff)

  return (
    <div className="bg-ipl-card border border-ipl-border rounded-2xl overflow-hidden">
      {/* Match header */}
      <div className="px-5 py-4 flex items-center justify-between border-b border-ipl-border">
        <div>
          <div className="flex items-center gap-2">
            {isLive && (
              <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">
                LIVE
              </span>
            )}
            <h2 className="font-semibold text-white text-lg">
              {home_team} <span className="text-gray-500 font-normal">vs</span> {away_team}
            </h2>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {isLive ? 'Match in progress' : kickoff.format('ddd D MMM, HH:mm')} · IPL 2026
          </p>
        </div>
        <button
          onClick={onViewBook}
          className="text-xs text-blue-400 hover:text-blue-300 border border-blue-800 hover:border-blue-600 px-3 py-1.5 rounded-lg transition-colors"
        >
          My Book
        </button>
      </div>

      <div className="p-5 space-y-4">
        {/* Odds comparison table */}
        <OddsTable
          bookmakers={bookmakers}
          homeTeam={home_team}
          awayTeam={away_team}
          onBet={onBet}
          wallet={wallet}
        />

        {/* Arbitrage panel */}
        {arbitrage && (
          <ArbitragePanel arbitrage={arbitrage} onBet={onBet} />
        )}
      </div>
    </div>
  )
}
