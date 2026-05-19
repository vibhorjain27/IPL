import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

export const fetchMatches   = ()              => api.get('/matches').then(r => r.data)
export const fetchWallet    = ()              => api.get('/wallet').then(r => r.data)
export const resetWallet    = ()              => api.post('/wallet/reset').then(r => r.data)
export const fetchBets      = ()              => api.get('/bets').then(r => r.data)
export const placeBet       = (payload)       => api.post('/bets', payload).then(r => r.data)
export const settleBets     = (matchId, winner) =>
  api.post(`/bets/${matchId}/settle`, { winner }).then(r => r.data)
export const fetchBook      = (matchId)       => api.get(`/book/${matchId}`).then(r => r.data)
