import { useState, useEffect, useRef } from "react";

const SYMBOLS = {
  "💎": { weight: 5,  payout: 100 },
  "⭐": { weight: 12, payout: 50  },
  "🔔": { weight: 25, payout: 20  },
  "🍋": { weight: 45, payout: 10  },
  "🍒": { weight: 70, payout: 5   },
  "🍇": { weight: 90, payout: 2   },
};

const PAYLINES = [
  [1,1,1,1,1],[0,0,0,0,0],[2,2,2,2,2],
  [0,1,2,1,0],[2,1,0,1,2],[0,0,1,2,2],
  [2,2,1,0,0],[1,0,0,0,1],[1,2,2,2,1],
  [0,1,0,1,0],[2,1,2,1,2],[1,0,1,2,1],
  [0,2,0,2,0],[2,0,2,0,2],[1,1,0,1,1],
  [1,1,2,1,1],[0,1,1,1,0],[2,1,1,1,2],
  [0,2,2,2,0],[2,0,0,0,2],
];

const PAYLINE_COLORS = [
  "#e74c3c","#e67e22","#f1c40f","#2ecc71","#1abc9c",
  "#3498db","#9b59b6","#e91e63","#00bcd4","#8bc34a",
  "#ff5722","#607d8b","#795548","#009688","#673ab7",
  "#f44336","#ff9800","#4caf50","#2196f3","#9c27b0",
];

const SYMBOL_LIST = Object.keys(SYMBOLS);
const WEIGHTS = Object.values(SYMBOLS).map(s => s.weight);
// Total bet options (automatically split across 20 lines)
const BET_OPTIONS = [20, 40, 100, 200, 500, 1000];

function weightedRandom() {
  const total = WEIGHTS.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < SYMBOL_LIST.length; i++) {
    r -= WEIGHTS[i];
    if (r <= 0) return SYMBOL_LIST[i];
  }
  return SYMBOL_LIST[SYMBOL_LIST.length - 1];
}

function spinLogic(betPerLine) {
  const grid = Array.from({ length: 5 }, () =>
    Array.from({ length: 3 }, () => weightedRandom())
  );
  let totalWin = 0;
  const wins = [];

  PAYLINES.forEach((payline, lineIdx) => {
    const lineSymbols = payline.map((row, col) => grid[col][row]);
    let matchCount = 1;
    const first = lineSymbols[0];
    for (let i = 1; i < lineSymbols.length; i++) {
      if (lineSymbols[i] === first) matchCount++;
      else break;
    }
    if (matchCount >= 3) {
      const multiplier = SYMBOLS[first].payout;
      const bonus = matchCount === 3 ? 1 : matchCount === 4 ? 2 : 5;
      const payout = betPerLine * multiplier * bonus;
      totalWin += payout;
      wins.push({ line: lineIdx, symbol: first, count: matchCount, payout, cells: payline.map((row, col) => ({ col, row })) });
    }
  });

  return { grid, totalWin, wins, totalBet: betPerLine * 20 };
}

const CELL_W = 68;
const CELL_H = 68;
const REEL_GAP = 6;
const REEL_BORDER = 2;
const SLOT_STEP = CELL_W + REEL_GAP + REEL_BORDER * 2;

function PaylineOverlay({ wins, activeWinIdx }) {
  if (!wins.length || activeWinIdx === null) return null;
  const win = wins[activeWinIdx];
  const color = PAYLINE_COLORS[win.line % PAYLINE_COLORS.length];

  // cx: center of cell within reel, accounting for 2px border on each reel
  const cx = (col) => col * SLOT_STEP + REEL_BORDER + CELL_W / 2;
  const cy = (row) => row * CELL_H + CELL_H / 2;

  const points = win.cells.map(({ col, row }) => `${cx(col)},${cy(row)}`).join(" ");
  const totalW = 5 * SLOT_STEP - REEL_GAP;
  const totalH = 3 * CELL_H;

  return (
    <svg
      style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none", zIndex: 10 }}
      width={totalW} height={totalH}
    >
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.9"
      />
      {win.cells.map(({ col, row }, i) => (
        <circle
          key={i}
          cx={cx(col)}
          cy={cy(row)}
          r="30"
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          opacity="0.9"
        />
      ))}
    </svg>
  );
}

const SPIN_SYMBOLS = ["🎰","🎲","💫","✨","🌀"];

function Reel({ column, spinning, stopDelay }) {
  const [displayCol, setDisplayCol] = useState(column);
  const [animating, setAnimating] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (spinning) {
      setAnimating(true);
      intervalRef.current = setInterval(() => {
        setDisplayCol([weightedRandom(), weightedRandom(), weightedRandom()]);
      }, 80);
    } else {
      setTimeout(() => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setDisplayCol(column);
        setAnimating(false);
      }, stopDelay);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [spinning]);

  useEffect(() => {
    if (!spinning) setDisplayCol(column);
  }, [column]);

  return (
    <div style={{
      display: "flex", flexDirection: "column", gap: 0,
      background: "linear-gradient(180deg,#1a1a2e 0%,#16213e 100%)",
      borderRadius: 10, overflow: "hidden",
      border: "2px solid #2d2d5e",
      boxShadow: animating ? "0 0 16px #7c3aed44" : "none",
      transition: "box-shadow 0.3s",
    }}>
      {displayCol.map((sym, i) => (
        <div key={i} style={{
          width: CELL_W, height: CELL_H,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 32,
          borderBottom: i < 2 ? "1px solid #2d2d5e" : "none",
          transition: animating ? "none" : "all 0.2s",
          filter: animating ? "blur(1px)" : "none",
          transform: animating ? "scaleY(1.05)" : "scaleY(1)",
        }}>{sym}</div>
      ))}
    </div>
  );
}

export default function SlotMachine() {
  const [balance, setBalance] = useState(1000);
  const [totalBetSelected, setTotalBetSelected] = useState(20);
  const [grid, setGrid] = useState(Array.from({ length: 5 }, () => ["🍒","🍇","🍋"]));
  const [spinning, setSpinning] = useState(false);
  const [reelSpinning, setReelSpinning] = useState([false,false,false,false,false]);
  const [wins, setWins] = useState([]);
  const [lastWin, setLastWin] = useState(null);
  const [activeWinIdx, setActiveWinIdx] = useState(null);
  const [resultGrid, setResultGrid] = useState(null);
  const winCycleRef = useRef(null);

  const betPerLine = totalBetSelected / 20;

  const handleSpin = () => {
    if (spinning || balance < totalBetSelected) return;
    setBalance(b => b - totalBetSelected);
    setWins([]);
    setLastWin(null);
    setActiveWinIdx(null);
    setResultGrid(null);
    if (winCycleRef.current) clearInterval(winCycleRef.current);

    setSpinning(true);
    setReelSpinning([true,true,true,true,true]);

    const result = spinLogic(betPerLine);

    [0,1,2,3,4].forEach(i => {
      setTimeout(() => {
        setReelSpinning(prev => { const n=[...prev]; n[i]=false; return n; });
        setGrid(prev => { const n=[...prev]; n[i]=result.grid[i]; return n; });

        if (i === 4) {
          setResultGrid(result.grid);
          setTimeout(() => {
            setSpinning(false);
            setLastWin(result.totalWin);
            setBalance(b => b + result.totalWin);
            setWins(result.wins);

            if (result.wins.length > 0) {
              let idx = 0;
              setActiveWinIdx(0);
              winCycleRef.current = setInterval(() => {
                idx = (idx + 1) % result.wins.length;
                setActiveWinIdx(idx);
              }, 900);
              setTimeout(() => {
                if (winCycleRef.current) clearInterval(winCycleRef.current);
                setActiveWinIdx(null);
              }, 900 * result.wins.length * 3 + 200);
            }
          }, 200);
        }
      }, 400 + i * 350);
    });
  };

  const handleReset = () => {
    setBalance(1000);
    setWins([]);
    setLastWin(null);
    setActiveWinIdx(null);
    if (winCycleRef.current) clearInterval(winCycleRef.current);
  };

  const activeWin = wins[activeWinIdx] ?? null;

  return (
    <div style={{
      minHeight: "100vh", background: "#0f0f23",
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", padding: "20px 16px", fontFamily: "sans-serif",
    }}>
      {/* Title */}
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <h1 style={{ color: "#ffd700", fontSize: 28, margin: 0, fontWeight: 700, letterSpacing: 2 }}>
          🎰 MEGA 5-REEL SLOTS
        </h1>
        <p style={{ color: "#8888bb", margin: "4px 0 0", fontSize: 13 }}>20 paylines</p>
      </div>

      {/* Balance */}
      <div style={{
        background: "#1a1a2e", border: "1px solid #2d2d5e", borderRadius: 12,
        padding: "10px 28px", marginBottom: 16, color: "#ffd700",
        fontSize: 22, fontWeight: 700,
      }}>
        💰 ${balance.toLocaleString()}
      </div>

      {/* Reels */}
      <div style={{ position: "relative", marginBottom: 16 }}>
        <div style={{ display: "flex", gap: REEL_GAP, position: "relative" }}>
          {grid.map((col, i) => (
            <Reel key={i} column={col} spinning={reelSpinning[i]} stopDelay={0} />
          ))}
        </div>
        {resultGrid && (
          <div style={{ position: "absolute", top: 0, left: 0 }}>
            <PaylineOverlay wins={wins} activeWinIdx={activeWinIdx} />
          </div>
        )}
      </div>

      {/* Win announcement */}
      <div style={{ height: 40, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
        {activeWin && (
          <div style={{
            background: PAYLINE_COLORS[activeWin.line % PAYLINE_COLORS.length],
            color: "#fff", borderRadius: 8, padding: "6px 20px",
            fontSize: 15, fontWeight: 600, animation: "pulse 0.5s ease-in-out",
          }}>
            Line {activeWin.line + 1}: {activeWin.symbol} x{activeWin.count} → +${activeWin.payout}
          </div>
        )}
        {lastWin !== null && lastWin > 0 && !activeWin && (
          <div style={{ color: "#ffd700", fontSize: 18, fontWeight: 700 }}>
            🎉 Total Win: ${lastWin}!
          </div>
        )}
        {lastWin === 0 && !spinning && lastWin !== null && (
          <div style={{ color: "#666", fontSize: 14 }}>No win this spin</div>
        )}
      </div>

      {/* Bet selector */}
      <div style={{
        background: "#1a1a2e", border: "1px solid #2d2d5e", borderRadius: 12,
        padding: "14px 20px", marginBottom: 16, width: "100%", maxWidth: 420,
      }}>
        <p style={{ color: "#8888bb", fontSize: 12, margin: "0 0 8px", textTransform: "uppercase", letterSpacing: 1 }}>
          Total bet (20 lines)
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {BET_OPTIONS.map(opt => (
            <button
              key={opt}
              onClick={() => setTotalBetSelected(opt)}
              disabled={spinning}
              style={{
                padding: "8px 14px", borderRadius: 8, border: "none", cursor: "pointer",
                background: totalBetSelected === opt ? "#7c3aed" : "#2d2d5e",
                color: totalBetSelected === opt ? "#fff" : "#8888bb",
                fontWeight: totalBetSelected === opt ? 700 : 400,
                fontSize: 14, transition: "all 0.15s",
              }}
            >${opt}</button>
          ))}
        </div>
        <p style={{ color: "#8888bb", fontSize: 12, margin: "8px 0 0" }}>
          ${betPerLine} per line × 20 lines
        </p>
      </div>

      {/* Spin button */}
      <div style={{ display: "flex", gap: 12 }}>
        <button
          onClick={handleSpin}
          disabled={spinning || balance < totalBetSelected}
          style={{
            padding: "14px 48px", fontSize: 18, fontWeight: 800, borderRadius: 12, border: "none",
            cursor: spinning || balance < totalBetSelected ? "not-allowed" : "pointer",
            background: spinning || balance < totalBetSelected
              ? "#333" : "linear-gradient(135deg,#7c3aed,#4f46e5)",
            color: spinning || balance < totalBetSelected ? "#666" : "#fff",
            letterSpacing: 2, transition: "all 0.2s",
            boxShadow: spinning ? "none" : "0 4px 20px #7c3aed66",
          }}
        >
          {spinning ? "SPINNING..." : "SPIN"}
        </button>
        <button
          onClick={handleReset}
          disabled={spinning}
          style={{
            padding: "14px 20px", fontSize: 14, borderRadius: 12, border: "1px solid #2d2d5e",
            cursor: "pointer", background: "transparent", color: "#8888bb",
          }}
        >Reset</button>
      </div>

      {/* Wins list */}
      {wins.length > 0 && (
        <div style={{
          marginTop: 20, background: "#1a1a2e", border: "1px solid #2d2d5e",
          borderRadius: 12, padding: "12px 16px", width: "100%", maxWidth: 420,
        }}>
          <p style={{ color: "#8888bb", fontSize: 11, margin: "0 0 8px", textTransform: "uppercase", letterSpacing: 1 }}>
            Winning lines
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {wins.map((w, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "4px 8px", borderRadius: 6,
                background: activeWinIdx === i ? "#2d2d5e" : "transparent",
                transition: "background 0.3s",
              }}>
                <div style={{
                  width: 10, height: 10, borderRadius: "50%",
                  background: PAYLINE_COLORS[w.line % PAYLINE_COLORS.length], flexShrink: 0,
                }} />
                <span style={{ color: "#ccc", fontSize: 13 }}>
                  Line {w.line + 1}: {w.symbol} ×{w.count}
                </span>
                <span style={{ color: "#ffd700", fontSize: 13, fontWeight: 600, marginLeft: "auto" }}>
                  +${w.payout}
                </span>
              </div>
            ))}
          </div>
          <div style={{ borderTop: "1px solid #2d2d5e", marginTop: 8, paddingTop: 8, display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#8888bb", fontSize: 12 }}>Total win</span>
            <span style={{ color: "#ffd700", fontWeight: 700 }}>${lastWin}</span>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.04)} }
      `}</style>
    </div>
  );
}