import { useState, useEffect, useCallback } from 'react'
import { fetchOdds } from './oddsApi'
import { useStore } from './useStore'
import Header from './components/Header'
import MatchCard from './components/MatchCard'
import Portfolio from './components/Portfolio'
import BetModal from './components/BetModal'
import BookBalancer from './components/BookBalancer'
import ApiKeyBanner from './components/ApiKeyBanner'

const REFRESH_MS = 30_000

export default function App() {
  const store = useStore()
  const [tab, setTab]           = useState('matches')
  const [matches, setMatches]   = useState([])
  const [isMock, setIsMock]     = useState(false)
  const [apiError, setApiError] = useState(null)
  const [loading, setLoading]   = useState(true)
  const [betModal, setBetModal] = useState(null)
  const [bookMatch, setBookMatch] = useState(null)
  const [lastRefresh, setLastRefresh] = useState(null)

  const refresh = useCallback(async () => {
    const { matches: m, isMock: mock, error } = await fetchOdds(store.apiKey)
    setMatches(m)
    setIsMock(mock)
    setApiError(error)
    setLastRefresh(new Date())
    setLoading(false)
  }, [store.apiKey])

  useEffect(() => {
    setLoading(true)
    refresh()
    const id = setInterval(refresh, REFRESH_MS)
    return () => clearInterval(id)
  }, [refresh])

  const onBetPlaced = () => setBetModal(null)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">🏏</div>
          <p className="text-gray-400 text-lg animate-pulse">Loading odds...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-ipl-dark">
      <Header
        wallet={store.wallet}
        isMock={isMock}
        lastRefresh={lastRefresh}
        onReset={store.resetAll}
        pendingBets={store.stats.pendingCount}
      />

      {/* Tab bar */}
      <div className="max-w-7xl mx-auto px-4 pt-4">
        <div className="flex gap-1 bg-ipl-card rounded-xl p-1 w-fit border border-ipl-border">
          {[
            { id: 'matches',   label: '🏟 Matches & Odds' },
            { id: 'portfolio', label: '📋 My Bets' },
            { id: 'book',      label: '📊 Book Balancer' },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === t.id
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-4">
        {tab === 'matches' && (
          <>
            <ApiKeyBanner
              apiKey={store.apiKey}
              isMock={isMock}
              error={apiError}
              onSave={store.setApiKey}
            />
            {matches.map(m => (
              <MatchCard
                key={m.id}
                match={m}
                wallet={store.wallet}
                onBet={(team, betType, odds) => setBetModal({ match: m, team, betType, odds })}
                onViewBook={() => { setBookMatch(m); setTab('book') }}
              />
            ))}
          </>
        )}

        {tab === 'portfolio' && (
          <Portfolio
            bets={store.bets}
            stats={store.stats}
            matches={matches}
            onSettle={store.settleBets}
          />
        )}

        {tab === 'book' && (
          <BookBalancer
            matches={matches}
            initialMatch={bookMatch}
            getBook={store.getBook}
          />
        )}
      </main>

      {betModal && (
        <BetModal
          match={betModal.match}
          team={betModal.team}
          betType={betModal.betType}
          odds={betModal.odds}
          wallet={store.wallet}
          onConfirm={(payload) => { store.placeBet(payload); onBetPlaced() }}
          onClose={() => setBetModal(null)}
        />
      )}
    </div>
  )
}
