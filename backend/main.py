from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import random

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class SlotMachine:
    # Σύμβολα και Πιθανότητες (Weights) / Πολλαπλασιαστές (Payouts)
    SYMBOLS = {
        "💎": {"weight": 5,   "payout": 1000},
        "⭐": {"weight": 12,  "payout": 500},
        "🔔": {"weight": 25,  "payout": 200},
        "🍋": {"weight": 45,  "payout": 100},
        "🍒": {"weight": 70,  "payout": 50},
        "🍇": {"weight": 90,  "payout": 20},
    }

    # Ορισμός 20 γραμμών πληρωμής (Paylines) σε πλέγμα 5x3
    # Κάθε λίστα περιέχει τα index (row) για κάθε στήλη [col0, col1, col2, col3, col4]
    PAYLINES = [
        [1, 1, 1, 1, 1], # 1: Μεσαία οριζόντια
        [0, 0, 0, 0, 0], # 2: Πάνω οριζόντια
        [2, 2, 2, 2, 2], # 3: Κάτω οριζόντια
        [0, 1, 2, 1, 0], # 4: V σχήμα
        [2, 1, 0, 1, 2], # 5: Ανάποδο V
        [0, 0, 1, 2, 2], # 6: Σκάλα κάτω
        [2, 2, 1, 0, 0], # 7: Σκάλα πάνω
        [1, 0, 0, 0, 1], # 8: Καμπύλη πάνω
        [1, 2, 2, 2, 1], # 9: Καμπύλη κάτω
        [0, 1, 0, 1, 0], # 10: Ζικ-ζακ πάνω
        [2, 1, 2, 1, 2], # 11: Ζικ-ζακ κάτω
        [1, 0, 1, 2, 1], # 12: Ρόμβος
        [0, 2, 0, 2, 0], # 13: Μεγάλο ζικ-ζακ
        [2, 0, 2, 0, 2], # 14: Μεγάλο ζικ-ζακ ανάποδα
        [1, 1, 0, 1, 1], # 15: Μικρή καμπούρα πάνω
        [1, 1, 2, 1, 1], # 16: Μικρή καμπούρα κάτω
        [0, 1, 1, 1, 0], # 17: Πλάγια τόξα πάνω
        [2, 1, 1, 1, 2], # 18: Πλάγια τόξα κάτω
        [0, 2, 2, 2, 0], # 19: Βαθύ U
        [2, 0, 0, 0, 2], # 20: Ανάποδο βαθύ U
    ]

    def __init__(self):
        self.balance = 1000

    def spin(self, bet_per_line: int):
        total_bet = bet_per_line * len(self.PAYLINES)
        if total_bet > self.balance:
            raise HTTPException(status_code=400, detail="Insufficient balance")
        
        self.balance -= total_bet

        # Δημιουργία πλέγματος 5 στηλών x 3 γραμμών
        # Το grid αποθηκεύεται ως list of lists: grid[στήλη][γραμμή]
        symbol_list = list(self.SYMBOLS.keys())
        weights = [s["weight"] for s in self.SYMBOLS.values()]
        
        grid = []
        for _ in range(5):
            column = random.choices(symbol_list, weights=weights, k=3)
            grid.append(column)

        total_win = 0
        wins = []

        # Έλεγχος των 20 γραμμών πληρωμής
        for line_id, payline in enumerate(self.PAYLINES):
            # Παίρνουμε τα σύμβολα που βρίσκονται στη διαδρομή της γραμμής
            line_symbols = [grid[col_idx][row_idx] for col_idx, row_idx in enumerate(payline)]
            
            # Υπολογισμός συνεχόμενων ίδιων συμβόλων από αριστερά
            match_count = 1
            first_symbol = line_symbols[0]
            for i in range(1, len(line_symbols)):
                if line_symbols[i] == first_symbol:
                    match_count += 1
                else:
                    break
            
            # Πληρωμή αν υπάρχουν 3 ή περισσότερα ίδια σύμβολα
            if match_count >= 3:
                multiplier = self.SYMBOLS[first_symbol]["payout"]
                # Bonus για 4 ή 5 σύμβολα στη σειρά
                bonus = 1 if match_count == 3 else (2 if match_count == 4 else 5)
                line_payout = bet_per_line * multiplier * bonus
                total_win += line_payout
                wins.append({
                    "line": line_id + 1,
                    "symbol": first_symbol,
                    "count": match_count,
                    "payout": line_payout
                })

        self.balance += total_win
        return {
            "grid": grid,
            "total_win": total_win,
            "winning_lines": wins,
            "balance": self.balance,
            "total_bet": total_bet
        }

game = SlotMachine()

@app.get("/status")
def get_status():
    return {"balance": game.balance}

@app.post("/spin")
def spin(bet_per_line: int = 1):
    return game.spin(bet_per_line)

@app.post("/reset")
def reset():
    game.balance = 1000
    return {"balance": game.balance}