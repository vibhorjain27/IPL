import os
import uuid
import sqlite3
import httpx
from datetime import datetime
from typing import Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

ODDS_API_KEY = os.getenv("ODDS_API_KEY", "")
ODDS_API_BASE = "https://api.the-odds-api.com/v4"
SPORT_KEY = "cricket_ipl"
STARTING_BALANCE = 10000.0

app = FastAPI(title="IPL Betting Simulator")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_PATH = os.path.join(os.path.dirname(__file__), "simulator.db")

# ---------------------------------------------------------------------------
# Database
# ---------------------------------------------------------------------------

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS wallet (
            id   INTEGER PRIMARY KEY,
            balance REAL NOT NULL DEFAULT 10000.0
        );
        CREATE TABLE IF NOT EXISTS bets (
            id           TEXT PRIMARY KEY,
            match_id     TEXT NOT NULL,
            match_name   TEXT NOT NULL,
            team         TEXT NOT NULL,
            bookmaker    TEXT NOT NULL,
            odds         REAL NOT NULL,
            stake        REAL NOT NULL,
            status       TEXT NOT NULL DEFAULT 'pending',
            payout       REAL,
            placed_at    TEXT NOT NULL,
            settled_at   TEXT
        );
        INSERT OR IGNORE INTO wallet (id, balance) VALUES (1, 10000.0);
    """)
    conn.commit()
    conn.close()


init_db()

# ---------------------------------------------------------------------------
# Mock data (used when no API key or off-season)
# ---------------------------------------------------------------------------

MOCK_MATCHES = [
    {
        "id": "mock_mi_csk_2026",
        "sport_key": "cricket_ipl",
        "commence_time": "2026-05-19T14:00:00Z",
        "home_team": "Mumbai Indians",
        "away_team": "Chennai Super Kings",
        "bookmakers": [
            {
                "key": "bet365",
                "title": "Bet365",
                "markets": [{"key": "h2h", "outcomes": [
                    {"name": "Mumbai Indians",     "price": 1.85},
                    {"name": "Chennai Super Kings","price": 2.10},
                ]}],
            },
            {
                "key": "pinnacle",
                "title": "Pinnacle",
                "markets": [{"key": "h2h", "outcomes": [
                    {"name": "Mumbai Indians",     "price": 1.90},
                    {"name": "Chennai Super Kings","price": 2.00},
                ]}],
            },
            {
                "key": "betfair",
                "title": "Betfair",
                "markets": [{"key": "h2h", "outcomes": [
                    {"name": "Mumbai Indians",     "price": 1.88},
                    {"name": "Chennai Super Kings","price": 2.05},
                ]}],
            },
            {
                "key": "sportsbet",
                "title": "Sportsbet",
                "markets": [{"key": "h2h", "outcomes": [
                    {"name": "Mumbai Indians",     "price": 1.83},
                    {"name": "Chennai Super Kings","price": 2.15},
                ]}],
            },
        ],
    },
    {
        "id": "mock_rcb_kkr_2026",
        "sport_key": "cricket_ipl",
        "commence_time": "2026-05-19T18:00:00Z",
        "home_team": "Royal Challengers Bangalore",
        "away_team": "Kolkata Knight Riders",
        "bookmakers": [
            {
                "key": "bet365",
                "title": "Bet365",
                "markets": [{"key": "h2h", "outcomes": [
                    {"name": "Royal Challengers Bangalore","price": 2.20},
                    {"name": "Kolkata Knight Riders",      "price": 1.75},
                ]}],
            },
            {
                "key": "pinnacle",
                "title": "Pinnacle",
                "markets": [{"key": "h2h", "outcomes": [
                    {"name": "Royal Challengers Bangalore","price": 2.30},
                    {"name": "Kolkata Knight Riders",      "price": 1.68},
                ]}],
            },
            {
                "key": "betfair",
                "title": "Betfair",
                "markets": [{"key": "h2h", "outcomes": [
                    {"name": "Royal Challengers Bangalore","price": 2.25},
                    {"name": "Kolkata Knight Riders",      "price": 1.72},
                ]}],
            },
        ],
    },
    {
        "id": "mock_srh_dc_2026",
        "sport_key": "cricket_ipl",
        "commence_time": "2026-05-20T14:00:00Z",
        "home_team": "Sunrisers Hyderabad",
        "away_team": "Delhi Capitals",
        "bookmakers": [
            {
                "key": "bet365",
                "title": "Bet365",
                "markets": [{"key": "h2h", "outcomes": [
                    {"name": "Sunrisers Hyderabad","price": 1.95},
                    {"name": "Delhi Capitals",     "price": 1.95},
                ]}],
            },
            {
                "key": "pinnacle",
                "title": "Pinnacle",
                "markets": [{"key": "h2h", "outcomes": [
                    {"name": "Sunrisers Hyderabad","price": 2.05},
                    {"name": "Delhi Capitals",     "price": 1.88},
                ]}],
            },
            {
                "key": "betfair",
                "title": "Betfair",
                "markets": [{"key": "h2h", "outcomes": [
                    {"name": "Sunrisers Hyderabad","price": 1.98},
                    {"name": "Delhi Capitals",     "price": 1.92},
                ]}],
            },
        ],
    },
]

# ---------------------------------------------------------------------------
# Odds fetching
# ---------------------------------------------------------------------------

async def fetch_live_odds():
    """Fetch odds from The Odds API; fall back to mock data on failure."""
    if not ODDS_API_KEY:
        return MOCK_MATCHES, True

    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(
                f"{ODDS_API_BASE}/sports/{SPORT_KEY}/odds",
                params={
                    "apiKey": ODDS_API_KEY,
                    "regions": "uk,eu,au",
                    "markets": "h2h",
                    "oddsFormat": "decimal",
                },
                timeout=10.0,
            )
            resp.raise_for_status()
            data = resp.json()
            return (data, False) if data else (MOCK_MATCHES, True)
        except Exception:
            return MOCK_MATCHES, True

# ---------------------------------------------------------------------------
# Arbitrage calculation
# ---------------------------------------------------------------------------

def calculate_arbitrage(match: dict) -> Optional[dict]:
    best: dict[str, dict] = {}

    for bm in match.get("bookmakers", []):
        for market in bm.get("markets", []):
            if market["key"] != "h2h":
                continue
            for outcome in market["outcomes"]:
                team, price = outcome["name"], outcome["price"]
                if team not in best or price > best[team]["odds"]:
                    best[team] = {"odds": price, "bookmaker": bm["title"], "bm_key": bm["key"]}

    if len(best) < 2:
        return None

    teams = list(best.keys())
    arb_pct = sum(1.0 / best[t]["odds"] for t in teams)
    is_arb = arb_pct < 1.0
    profit_margin = round((1.0 - arb_pct) * 100, 2) if is_arb else None

    # Optimal stakes for ₹1,000 total outlay
    optimal_stakes: dict = {}
    if is_arb:
        for t in teams:
            stake = round(1000 / (best[t]["odds"] * arb_pct), 2)
            optimal_stakes[t] = {
                "bookmaker": best[t]["bookmaker"],
                "odds": best[t]["odds"],
                "stake": stake,
                "guaranteed_return": round(1000 / arb_pct, 2),
            }

    return {
        "best_odds": best,
        "arb_percentage": round(arb_pct * 100, 2),
        "is_arbitrage": is_arb,
        "profit_margin": profit_margin,
        "margin_over_round": round((arb_pct - 1) * 100, 2) if not is_arb else None,
        "optimal_stakes": optimal_stakes if is_arb else None,
    }

# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------

class BetRequest(BaseModel):
    match_id: str
    match_name: str
    team: str
    bookmaker: str
    odds: float
    stake: float


class SettleRequest(BaseModel):
    winner: str

# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/matches")
async def get_matches():
    raw, is_mock = await fetch_live_odds()
    matches = []
    for m in raw:
        matches.append({
            "id": m["id"],
            "home_team": m["home_team"],
            "away_team": m["away_team"],
            "commence_time": m["commence_time"],
            "bookmakers": m["bookmakers"],
            "arbitrage": calculate_arbitrage(m),
        })
    return {"matches": matches, "is_mock": is_mock, "count": len(matches)}


@app.get("/api/wallet")
def get_wallet():
    conn = get_db()
    row = conn.execute("SELECT balance FROM wallet WHERE id = 1").fetchone()
    conn.close()
    return {"balance": round(row["balance"], 2)}


@app.post("/api/wallet/reset")
def reset_wallet():
    conn = get_db()
    conn.execute("UPDATE wallet SET balance = ? WHERE id = 1", (STARTING_BALANCE,))
    conn.execute("DELETE FROM bets")
    conn.commit()
    conn.close()
    return {"balance": STARTING_BALANCE, "message": "Wallet and bets reset to ₹10,000"}


@app.post("/api/bets")
def place_bet(bet: BetRequest):
    if bet.stake <= 0:
        raise HTTPException(400, "Stake must be positive")
    if bet.odds < 1.01:
        raise HTTPException(400, "Invalid odds")

    conn = get_db()
    balance = conn.execute("SELECT balance FROM wallet WHERE id = 1").fetchone()["balance"]
    if bet.stake > balance:
        conn.close()
        raise HTTPException(400, f"Insufficient balance. Available: ₹{balance:.2f}")

    bet_id = str(uuid.uuid4())
    conn.execute(
        """INSERT INTO bets (id, match_id, match_name, team, bookmaker, odds, stake, placed_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        (bet_id, bet.match_id, bet.match_name, bet.team, bet.bookmaker,
         bet.odds, bet.stake, datetime.utcnow().isoformat()),
    )
    conn.execute("UPDATE wallet SET balance = balance - ? WHERE id = 1", (bet.stake,))
    conn.commit()
    new_balance = conn.execute("SELECT balance FROM wallet WHERE id = 1").fetchone()["balance"]
    conn.close()

    return {
        "id": bet_id,
        "message": f"Bet placed: ₹{bet.stake:.2f} on {bet.team} @ {bet.odds}",
        "potential_payout": round(bet.stake * bet.odds, 2),
        "new_balance": round(new_balance, 2),
    }


@app.get("/api/bets")
def get_bets():
    conn = get_db()
    rows = conn.execute("SELECT * FROM bets ORDER BY placed_at DESC").fetchall()
    conn.close()
    bets = [dict(r) for r in rows]

    pending  = [b for b in bets if b["status"] == "pending"]
    settled  = [b for b in bets if b["status"] != "pending"]
    wins     = [b for b in settled if b["status"] == "won"]
    losses   = [b for b in settled if b["status"] == "lost"]
    net_pnl  = sum((b["payout"] or 0) - b["stake"] for b in wins) - sum(b["stake"] for b in losses)

    return {
        "bets": bets,
        "stats": {
            "pending_count":  len(pending),
            "pending_stake":  round(sum(b["stake"] for b in pending), 2),
            "total_settled":  len(settled),
            "wins":           len(wins),
            "losses":         len(losses),
            "net_pnl":        round(net_pnl, 2),
            "win_rate":       round(len(wins) / len(settled) * 100, 1) if settled else 0,
        },
    }


@app.post("/api/bets/{match_id}/settle")
def settle_bets(match_id: str, req: SettleRequest):
    conn = get_db()
    pending = conn.execute(
        "SELECT * FROM bets WHERE match_id = ? AND status = 'pending'", (match_id,)
    ).fetchall()

    if not pending:
        conn.close()
        raise HTTPException(404, "No pending bets for this match")

    payout_total = 0.0
    now = datetime.utcnow().isoformat()

    for bet in pending:
        if bet["team"] == req.winner:
            payout = round(bet["odds"] * bet["stake"], 2)
            conn.execute(
                "UPDATE bets SET status='won', payout=?, settled_at=? WHERE id=?",
                (payout, now, bet["id"]),
            )
            conn.execute("UPDATE wallet SET balance = balance + ? WHERE id = 1", (payout,))
            payout_total += payout
        else:
            conn.execute(
                "UPDATE bets SET status='lost', payout=0, settled_at=? WHERE id=?",
                (now, bet["id"]),
            )

    conn.commit()
    new_balance = conn.execute("SELECT balance FROM wallet WHERE id = 1").fetchone()["balance"]
    conn.close()

    return {
        "settled": len(pending),
        "winner": req.winner,
        "payout": round(payout_total, 2),
        "new_balance": round(new_balance, 2),
    }


@app.get("/api/book/{match_id}")
def get_book(match_id: str):
    """Return your current book exposure for a match."""
    conn = get_db()
    bets = conn.execute(
        "SELECT * FROM bets WHERE match_id = ? AND status = 'pending'", (match_id,)
    ).fetchall()
    conn.close()

    book: dict[str, dict] = {}
    total_stake = 0.0

    for bet in bets:
        team = bet["team"]
        total_stake += bet["stake"]
        if team not in book:
            book[team] = {"total_stake": 0.0, "total_payout": 0.0, "bets": []}
        book[team]["total_stake"]  += bet["stake"]
        book[team]["total_payout"] += bet["odds"] * bet["stake"]
        book[team]["bets"].append(dict(bet))

    # P&L if each team wins
    for team in book:
        opponents_stake = total_stake - book[team]["total_stake"]
        book[team]["pnl_if_wins"]  = round(book[team]["total_payout"] - total_stake, 2)
        book[team]["pnl_if_loses"] = round(opponents_stake - book[team]["total_stake"] -
                                           sum(v["total_payout"] for k, v in book.items() if k != team), 2)

    return {
        "match_id": match_id,
        "book": book,
        "total_staked": round(total_stake, 2),
    }
