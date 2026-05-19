# IPL Betting Simulator 🏏

Practice sports betting with **virtual money** using real-time IPL odds. Built for learning book balancing and arbitrage trading — zero financial risk.

## Features

| Feature | Description |
|---------|-------------|
| **Live Odds** | Pulls real odds from [The Odds API](https://the-odds-api.com/) across Bet365, Pinnacle, Betfair, and more |
| **Virtual Wallet** | Start with ₹10,000 virtual INR; place and track bets |
| **Arbitrage Detector** | Automatically detects when combined odds across bookmakers guarantee profit, with optimal stake calculator |
| **Book Balancer** | See your P&L for every possible match outcome; get rebalancing tips |
| **Portfolio** | Full bet history with win/loss P&L, win rate, and one-click settlement |
| **Demo Mode** | Works offline with realistic mock odds — no API key needed to explore |

## Quick Start

### Local (dev)

**Backend:**
```bash
cd backend
pip install -r requirements.txt

# Optional: add your Odds API key for live data
cp .env.example .env
# edit .env and set ODDS_API_KEY=<your_key>

uvicorn main:app --reload
# -> http://localhost:8000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
# -> http://localhost:5173
```

### Docker (production)

```bash
# Optional: set your key
echo "ODDS_API_KEY=your_key" > .env

docker-compose up --build
# -> http://localhost:5173
```

## Live Odds API

This app uses [The Odds API](https://the-odds-api.com/):
- **Free tier**: 500 requests/month (approx 16 refreshes/day at 30s polling)
- **Sport key**: `cricket_ipl`
- Get a free key at the-odds-api.com
- Without a key the app runs in **demo mode** with realistic mock data

## How It Works

### Arbitrage Trading
An arb exists when the sum of implied probabilities across all outcomes is less than 100%:

```
Arb% = (1/oddsA + 1/oddsB) x 100

If Arb% < 100  ->  guaranteed profit exists
If Arb% > 100  ->  bookmaker margin (over-round)
```

The app calculates the optimal stake split for Rs 1,000 total outlay to lock in the guaranteed return.

### Book Balancing
Your "book" shows net P&L for each possible outcome:

```
P&L if Team A wins = Total payout to A backers - Total stakes received
```

A balanced book means you profit (or break even) no matter who wins. The Book Balancer tab visualises this and suggests which side to bet more on.

## Project Structure

```
IPL/
├── backend/
│   ├── main.py          # FastAPI — routes, odds fetching, arb calc, book logic
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── api.js
│   │   └── components/
│   │       ├── Header.jsx          # Wallet + status bar
│   │       ├── MatchCard.jsx       # Match with odds + arb panel
│   │       ├── OddsTable.jsx       # Cross-bookmaker odds grid
│   │       ├── ArbitragePanel.jsx  # Arb analysis + optimal stakes
│   │       ├── BetModal.jsx        # Bet placement UI
│   │       ├── Portfolio.jsx       # Bet history + settlement
│   │       └── BookBalancer.jsx    # P&L per outcome
│   └── package.json
└── docker-compose.yml
```
