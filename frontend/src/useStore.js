// All simulator state lives in localStorage — no backend needed.
import { useState, useCallback } from 'react'

const KEY = 'ipl_sim_v1'

const INITIAL = {
  wallet: 10000,
  bets:   [],
  apiKey: '',
}

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? { ...INITIAL, ...JSON.parse(raw) } : INITIAL
  } catch {
    return INITIAL
  }
}

function persist(state) {
  localStorage.setItem(KEY, JSON.stringify(state))
}

export function useStore() {
  const [state, setState] = useState(load)

  const mutate = useCallback((fn) => {
    setState(prev => {
      const next = fn(prev)
      persist(next)
      return next
    })
  }, [])

  const setApiKey = useCallback((key) => {
    mutate(s => ({ ...s, apiKey: key.trim() }))
  }, [mutate])

  const placeBet = useCallback(({ matchId, matchName, team, bookmaker, odds, stake }) => {
    mutate(s => {
      if (stake > s.wallet) throw new Error('Insufficient balance')
      return {
        ...s,
        wallet: +(s.wallet - stake).toFixed(2),
        bets: [...s.bets, {
          id:         crypto.randomUUID(),
          matchId, matchName, team, bookmaker,
          odds:       +odds,
          stake:      +stake,
          status:     'pending',
          payout:     null,
          placedAt:   new Date().toISOString(),
          settledAt:  null,
        }],
      }
    })
  }, [mutate])

  const settleBets = useCallback((matchId, winner) => {
    mutate(s => {
      let walletDelta = 0
      const bets = s.bets.map(b => {
        if (b.matchId !== matchId || b.status !== 'pending') return b
        if (b.team === winner) {
          const payout = +(b.stake * b.odds).toFixed(2)
          walletDelta += payout
          return { ...b, status: 'won', payout, settledAt: new Date().toISOString() }
        }
        return { ...b, status: 'lost', payout: 0, settledAt: new Date().toISOString() }
      })
      return { ...s, wallet: +(s.wallet + walletDelta).toFixed(2), bets }
    })
  }, [mutate])

  const resetAll = useCallback(() => {
    mutate(() => INITIAL)
  }, [mutate])

  // Derived book for a match (pending bets only)
  const getBook = useCallback((matchId, teams) => {
    const pending = state.bets.filter(b => b.matchId === matchId && b.status === 'pending')
    const totalStaked = pending.reduce((s, b) => s + b.stake, 0)

    const book = {}
    for (const t of teams) book[t] = { totalStake: 0, totalPayout: 0, bets: [] }
    for (const b of pending) {
      if (!book[b.team]) book[b.team] = { totalStake: 0, totalPayout: 0, bets: [] }
      book[b.team].totalStake  += b.stake
      book[b.team].totalPayout += b.stake * b.odds
      book[b.team].bets.push(b)
    }
    for (const t of Object.keys(book)) {
      book[t].pnlIfWins = +(book[t].totalPayout - totalStaked).toFixed(2)
    }
    return { book, totalStaked: +totalStaked.toFixed(2), pending }
  }, [state.bets])

  // Bet stats
  const stats = (() => {
    const pending  = state.bets.filter(b => b.status === 'pending')
    const settled  = state.bets.filter(b => b.status !== 'pending')
    const wins     = settled.filter(b => b.status === 'won')
    const netPnl   = wins.reduce((s, b) => s + (b.payout - b.stake), 0)
                   - settled.filter(b => b.status === 'lost').reduce((s, b) => s + b.stake, 0)
    return {
      pendingCount:  pending.length,
      pendingStake:  +pending.reduce((s, b) => s + b.stake, 0).toFixed(2),
      totalSettled:  settled.length,
      wins:          wins.length,
      losses:        settled.length - wins.length,
      netPnl:        +netPnl.toFixed(2),
      winRate:       settled.length ? +(wins.length / settled.length * 100).toFixed(1) : 0,
    }
  })()

  return { ...state, stats, placeBet, settleBets, resetAll, setApiKey, getBook }
}
