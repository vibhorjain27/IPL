import { useState, useCallback } from 'react'

const KEY = 'ipl_sim_v2'

const INITIAL = { wallet: 10000, bets: [], apiKey: '' }

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? { ...INITIAL, ...JSON.parse(raw) } : INITIAL
  } catch { return INITIAL }
}

function persist(s) { localStorage.setItem(KEY, JSON.stringify(s)) }

export function useStore() {
  const [state, setState] = useState(load)

  const mutate = useCallback((fn) => {
    setState(prev => { const next = fn(prev); persist(next); return next })
  }, [])

  const setApiKey = useCallback(key => mutate(s => ({ ...s, apiKey: key.trim() })), [mutate])

  // -------------------------------------------------------------------------
  // Place bet — back or lay
  // Back: wallet -= stake
  // Lay:  wallet -= liability = (odds - 1) * stake   (stake = backer's stake)
  // -------------------------------------------------------------------------
  const placeBet = useCallback(({ matchId, matchName, team, betType, odds, stake }) => {
    const liability = betType === 'lay' ? +((odds - 1) * stake).toFixed(2) : 0
    const walletCost = betType === 'lay' ? liability : stake

    mutate(s => {
      if (walletCost > s.wallet) throw new Error('Insufficient balance')
      return {
        ...s,
        wallet: +(s.wallet - walletCost).toFixed(2),
        bets: [...s.bets, {
          id: crypto.randomUUID(),
          matchId, matchName, team,
          betType,
          odds:      +odds,
          stake:     +stake,     // for lay: this is the backer's stake you're accepting
          liability,             // for lay: the max you can lose; for back: 0
          status: 'pending',
          payout: null,
          placedAt:  new Date().toISOString(),
          settledAt: null,
        }],
      }
    })
  }, [mutate])

  // -------------------------------------------------------------------------
  // Settle — payout formula is identical for both back-win and lay-win:
  //   payout = odds * stake
  // Back wins  when team === winner
  // Lay wins   when team !== winner  (you bet the selection would LOSE)
  // -------------------------------------------------------------------------
  const settleBets = useCallback((matchId, winner) => {
    mutate(s => {
      let walletDelta = 0
      const bets = s.bets.map(b => {
        if (b.matchId !== matchId || b.status !== 'pending') return b
        const won = b.betType === 'back' ? b.team === winner : b.team !== winner
        if (won) {
          const payout = +(b.odds * b.stake).toFixed(2)
          walletDelta += payout
          return { ...b, status: 'won', payout, settledAt: new Date().toISOString() }
        }
        return { ...b, status: 'lost', payout: 0, settledAt: new Date().toISOString() }
      })
      return { ...s, wallet: +(s.wallet + walletDelta).toFixed(2), bets }
    })
  }, [mutate])

  const resetAll = useCallback(() => mutate(() => INITIAL), [mutate])

  // -------------------------------------------------------------------------
  // Book: net P&L for each outcome
  // If Team X wins:
  //   back on X  → profit = (odds-1)*stake
  //   back on Y  → loss   = -stake
  //   lay on X   → loss   = -(odds-1)*stake  (liability already paid, no recovery)
  //   lay on Y   → profit = +stake           (backer's stake, net of liability paid)
  // -------------------------------------------------------------------------
  const getBook = useCallback((matchId, teams) => {
    const pending = state.bets.filter(b => b.matchId === matchId && b.status === 'pending')
    const totalExposure = pending.reduce((s, b) =>
      s + (b.betType === 'back' ? b.stake : b.liability), 0)

    const pnlIfWins = {}
    for (const team of teams) {
      let pnl = 0
      for (const b of pending) {
        if (b.betType === 'back') {
          pnl += b.team === team ? (b.odds - 1) * b.stake : -b.stake
        } else {
          pnl += b.team === team ? -(b.odds - 1) * b.stake : b.stake
        }
      }
      pnlIfWins[team] = +pnl.toFixed(2)
    }

    return { pnlIfWins, pending, totalExposure: +totalExposure.toFixed(2) }
  }, [state.bets])

  // Stats
  const stats = (() => {
    const pending = state.bets.filter(b => b.status === 'pending')
    const settled = state.bets.filter(b => b.status !== 'pending')
    const wins    = settled.filter(b => b.status === 'won')
    const netPnl  = wins.reduce((s, b) => {
      const cost = b.betType === 'back' ? b.stake : b.liability
      return s + (b.payout - cost)
    }, 0) - settled.filter(b => b.status === 'lost').reduce((s, b) => s, 0)
    // For losses, the cost was already deducted at placement so pnl contribution is 0 at settlement
    const truePnl = settled.reduce((s, b) => {
      const cost = b.betType === 'back' ? b.stake : b.liability
      return s + (b.status === 'won' ? b.payout - cost : -cost)
    }, 0)

    return {
      pendingCount: pending.length,
      pendingExposure: +pending.reduce((s, b) =>
        s + (b.betType === 'back' ? b.stake : b.liability), 0).toFixed(2),
      totalSettled: settled.length,
      wins: wins.length,
      losses: settled.length - wins.length,
      netPnl: +truePnl.toFixed(2),
      winRate: settled.length ? +(wins.length / settled.length * 100).toFixed(1) : 0,
    }
  })()

  return { ...state, stats, placeBet, settleBets, resetAll, setApiKey, getBook }
}
