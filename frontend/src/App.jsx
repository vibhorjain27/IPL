import { useState, useEffect, useCallback } from 'react'
import { fetchMatches, fetchWallet, fetchBets } from './api'
import Header from './components/Header'
import MatchCard from './components/MatchCard'
import Portfolio from './components/Portfolio'
import BetModal from './components/BetModal'
import BookBalancer from './components/BookBalancer'

const REFRESH_INTERVAL = 30_000

export default function App() {
  const [tab, setTab]           = useState('matches')   // matches | portfolio | book
  const [matches, setMatches]   = useState([])
  const [wallet, setWallet]     = useState(null)
  const [betsData, setBetsData] = useState(null)
  const [isMock, setIsMock]     = useState(false)
  const [loading, setLoading]   = useState(true)
  const [betModal, setBetModal] = useState(null)        // { match, team, bookmaker, odds }
  const [bookMatch, setBookMatch] = useState(null)
  const [lastRefresh, setLastRefresh] = useState(null)

  const loadAll = useCallback(async () => {
    try {
      const [m, w, b] = await Promise.all([fetchMatches(), fetchWallet(), fetchBets()])
      setMatches(m.matches)
      setIsMock(m.is_mock)
      setWallet(w.balance)
      setBetsData(b)
      setLastRefresh(new Date())
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAll()
    const id = setInterval(loadAll, REFRESH_INTERVAL)
    return () => clearInterval(id)
  }, [loadAll])

  const onBetPlaced = async () => {
    setBetModal(null)
    const [w, b] = await Promise.all([fetchWallet(), fetchBets()])
    setWallet(w.balance)
    setBetsData(b)
  }

  const onSettled = async () => {
    const [w, b] = await Promise.all([fetchWallet(), fetchBets()])
    setWallet(w.balance)
    setBetsData(b)
  }

  const onReset = async () => {
    const [w, b] = await Promise.all([fetchWallet(), fetchBets()])
    setWallet(w.balance)
    setBetsData(b)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">🏏</div>
          <p className="text-gray-400 text-lg">Loading IPL odds...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-ipl-dark">
      <Header
        wallet={wallet}
        isMock={isMock}
        lastRefresh={lastRefresh}
        onReset={onReset}
        pendingBets={betsData?.stats?.pending_count ?? 0}
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

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {tab === 'matches' && (
          <>
            {isMock && (
              <div className="bg-yellow-900/30 border border-yellow-700 rounded-xl px-4 py-3 text-yellow-300 text-sm flex items-center gap-2">
                <span>⚠️</span>
                <span>
                  <strong>Demo mode</strong> — showing realistic mock odds.{' '}
                  Add your free <a
                    href="https://the-odds-api.com/"
                    target="_blank"
                    rel="noreferrer"
                    className="underline"
                  >The Odds API</a> key in <code className="bg-black/30 px-1 rounded">backend/.env</code> to see live prices.
                </span>
              </div>
            )}
            {matches.length === 0 ? (
              <div className="text-center py-20 text-gray-500">
                <div className="text-5xl mb-3">🏏</div>
                <p>No IPL matches found right now.</p>
              </div>
            ) : (
              matches.map(m => (
                <MatchCard
                  key={m.id}
                  match={m}
                  wallet={wallet}
                  onBet={(team, bookmaker, odds) =>
                    setBetModal({ match: m, team, bookmaker, odds })
                  }
                  onViewBook={() => { setBookMatch(m); setTab('book') }}
                />
              ))
            )}
          </>
        )}

        {tab === 'portfolio' && (
          <Portfolio
            betsData={betsData}
            matches={matches}
            onSettle={onSettled}
          />
        )}

        {tab === 'book' && (
          <BookBalancer
            matches={matches}
            initialMatch={bookMatch}
          />
        )}
      </main>

      {betModal && (
        <BetModal
          match={betModal.match}
          team={betModal.team}
          bookmaker={betModal.bookmaker}
          odds={betModal.odds}
          wallet={wallet}
          onConfirm={onBetPlaced}
          onClose={() => setBetModal(null)}
        />
      )}
    </div>
  )
}
