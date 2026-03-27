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

class SlotMachine:
    """
    Κλάση που αναπαριστά τη λογική και την κατάσταση του "φρουτακίου".
    """
    # Τα σύμβολα μπορούν να είναι χαρακτηριστικό (attribute) της κλάσης
    SYMBOLS = {
        "💎": {"weight": 10,  "payout": 50},
        "⭐": {"weight": 30, "payout": 20},
        "🔔": {"weight": 50, "payout": 10},
        "🍋": {"weight": 100, "payout": 5},
        "🍒": {"weight": 200, "payout": 2},
    }

    def __init__(self, initial_balance: int = 1000):
        # Αρχικοποίηση της κατάστασης του παιχνιδιού για τον παίκτη
        self.initial_balance = initial_balance
        self.balance = initial_balance
        self.last_win = 0

    def get_status(self) -> dict:
        """Επιστρέφει την τρέχουσα κατάσταση του παίκτη."""
        return {
            "balance": self.balance,
            "last_win": self.last_win
        }

    def spin(self, bet: int) -> dict:
        """Εκτελεί μια περιστροφή και υπολογίζει τα κέρδη/απώλειες."""
        if bet <= 0:
            raise HTTPException(status_code=400, detail="Το ποντάρισμα πρέπει να είναι θετικό")
        if bet > self.balance:
            raise HTTPException(status_code=400, detail="Δεν έχεις αρκετό υπόλοιπο")

        # Αφαίρεση πονταρίσματος
        self.balance -= bet

        symbol_list = list(self.SYMBOLS.keys())
        weights = [s["weight"] for s in self.SYMBOLS.values()]
        reels = random.choices(symbol_list, weights=weights, k=3)

        win_amount = 0
        is_win = False

        # Έλεγχος για νίκη (3 ίδια σύμβολα)
        if reels[0] == reels[1] == reels[2]:
            is_win = True
            multiplier = self.SYMBOLS[reels[0]]["payout"]
            win_amount = bet * multiplier
            self.balance += win_amount

        self.last_win = win_amount

        return {
            "reels": reels,
            "is_win": is_win,
            "win_amount": win_amount,
            "new_balance": self.balance
        }

    def reset(self) -> dict:
        """Επαναφέρει το παιχνίδι στην αρχική του κατάσταση."""
        self.balance = self.initial_balance
        self.last_win = 0
        return {"message": "Το υπόλοιπο ανανεώθηκε!", "balance": self.balance}


# ---------------------------------------------------------
# API Endpoints (Δρομολόγηση - Routing)
# ---------------------------------------------------------

# Δημιουργούμε το "αντικείμενο" του παιχνιδιού
game = SlotMachine()

@app.get("/status")
def get_status():
    return game.get_status()

@app.post("/spin")
def spin(bet: int):
    return game.spin(bet)

@app.post("/reset")
def reset_game():
    return game.reset()