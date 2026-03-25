from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import random

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

SYMBOLS = {
    "💎": {"weight": 5,  "payout": 50},
    "⭐": {"weight": 15, "payout": 20},
    "🔔": {"weight": 25, "payout": 10},
    "🍋": {"weight": 35, "payout": 5},
    "🍒": {"weight": 50, "payout": 2},
}

user_data = {
    "balance": 1000,
    "last_win": 0
}

@app.get("/status")
def get_status():
    return user_data

# FIX: το bet ερχόταν σωστά ως query param, αλλά δεν γινόταν validate σωστά
@app.post("/spin")
def spin(bet: int):
    global user_data

    if bet <= 0:
        raise HTTPException(status_code=400, detail="Το ποντάρισμα πρέπει να είναι θετικό")
    if bet > user_data["balance"]:
        raise HTTPException(status_code=400, detail="Δεν έχεις αρκετό υπόλοιπο")

    user_data["balance"] -= bet

    symbol_list = list(SYMBOLS.keys())
    weights = [s["weight"] for s in SYMBOLS.values()]
    reels = random.choices(symbol_list, weights=weights, k=3)

    win_amount = 0
    is_win = False

    if reels[0] == reels[1] == reels[2]:
        is_win = True
        multiplier = SYMBOLS[reels[0]]["payout"]
        win_amount = bet * multiplier
        user_data["balance"] += win_amount

    user_data["last_win"] = win_amount

    return {
        "reels": reels,
        "is_win": is_win,
        "win_amount": win_amount,
        "new_balance": user_data["balance"]
    }

@app.post("/reset")
def reset_game():
    user_data["balance"] = 1000
    user_data["last_win"] = 0
    return {"message": "Το υπόλοιπο ανανεώθηκε!", "balance": 1000}