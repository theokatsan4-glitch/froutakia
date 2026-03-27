import React, { useState, useEffect } from 'react';

const API = 'http://localhost:8000';

const SYMBOLS_INFO = {
  "💎": { payout: 50, label: "σπάνιο" },
  "⭐": { payout: 20, label: "σπάνιο" },
  "🔔": { payout: 10, label: "μέτριο" },
  "🍋": { payout: 5,  label: "συχνό" },
  "🍒": { payout: 2,  label: "πολύ συχνό" },
};

const ALL_SYMBOLS = Object.keys(SYMBOLS_INFO);

// Σταθερά ύψη για το εφέ της ρουλέτας
const SYMBOL_HEIGHT = 110; 
const REEL_VIEWPORT_HEIGHT = 220; // 2 φορές το ύψος του συμβόλου (δείχνει το μεσαίο και τα μισά πάνω/κάτω)

function App() {
  const [reels, setReels]           = useState(['🍒', '🍒', '🍒']);
  const [balance, setBalance]       = useState(0);
  const [bet, setBet]               = useState(10);
  const [message, setMessage]       = useState('Καλή τύχη!');
  
  const [isSpinning, setIsSpinning] = useState(false); 
  const [reelSpinStatuses, setReelSpinStatuses] = useState([false, false, false]);
  const [hasSpun, setHasSpun]       = useState(false); // Για να ξέρουμε πότε να κάνουμε το bounce animation
  
  const [isWin, setIsWin]           = useState(false);
  const [connected, setConnected]   = useState(true);
  const [autoSpin, setAutoSpin]     = useState(false);

  // Αρχική φόρτωση του υπολοίπου
  useEffect(() => {
    fetch(`${API}/status`)
      .then(res => res.json())
      .then(data => setBalance(data.balance))
      .catch(() => {
        setConnected(false);
        setMessage('❌ Δεν βρέθηκε το backend! Τρέξε: python -m uvicorn main:app --reload');
      });
  }, []);

  // Λογική για το AUTO SPIN
  useEffect(() => {
    let timer;
    if (autoSpin && !isSpinning && connected && balance > 0) {
      const delay = isWin ? 1500 : 500;
      timer = setTimeout(() => {
        spin();
      }, delay);
    } else if (balance <= 0 && autoSpin) {
      setAutoSpin(false); 
    }
    return () => clearTimeout(timer);
  }, [autoSpin, isSpinning, isWin, balance, connected]);

  const spin = async () => {
    if (isSpinning || !connected) return;

    const betValue = parseInt(bet, 10);
    if (isNaN(betValue) || betValue <= 0) {
      setMessage('⚠️ Βάλε ένα θετικό ποντάρισμα.');
      setAutoSpin(false);
      return;
    }
    if (betValue > balance) {
      setMessage('⚠️ Δεν έχεις αρκετό υπόλοιπο!');
      setAutoSpin(false);
      return;
    }

    setIsSpinning(true);
    setIsWin(false);
    setHasSpun(true);
    setMessage('Περιστροφή...');
    
    // Ξεκινάνε όλοι οι τροχοί
    setReelSpinStatuses([true, true, true]);

    try {
      const response = await fetch(`${API}/spin?bet=${betValue}`, { method: 'POST' });
      const data = await response.json();

      if (!response.ok) {
        setMessage(`⚠️ ${data.detail}`);
        setIsSpinning(false);
        setReelSpinStatuses([false, false, false]);
        setAutoSpin(false);
        return;
      }

      const finalReels = data.reels;
      
      const baseDelay = 400; 
      const staggerDelay = 250; 

      // Σταματάμε τους τροχούς με καθυστέρηση (staggering)
      [0, 1, 2].forEach(index => {
          setTimeout(() => {
              // 1. Βάζουμε το τελικό σύμβολο
              setReels(prevReels => {
                  const newReels = [...prevReels];
                  newReels[index] = finalReels[index];
                  return newReels;
              });

              // 2. Σταματάμε το spinning status για να παίξει το bounce animation
              setReelSpinStatuses(prevStatuses => {
                  const newStatuses = [...prevStatuses];
                  newStatuses[index] = false;
                  return newStatuses;
              });

              // 3. Στον τελευταίο τροχό ενημερώνουμε το τελικό αποτέλεσμα
              if (index === 2) {
                  setBalance(data.new_balance);
                  setIsSpinning(false); 
                  setIsWin(data.is_win);

                  if (data.is_win) {
                      setMessage(`🎉 ΚΕΡΔΙΣΕΣ ${data.win_amount} €!`);
                  } else if (data.new_balance <= 0) {
                      setMessage('Δεν έχεις άλλα χρήματα! Πάτα Reset.');
                      setAutoSpin(false);
                  } else {
                      setMessage('Δοκίμασε ξανά!');
                  }
              }
          }, baseDelay + (index * staggerDelay)); 
      });

    } catch (err) {
      setMessage('❌ Δεν βρέθηκε το backend!');
      setIsSpinning(false);
      setReelSpinStatuses([false, false, false]);
      setAutoSpin(false);
    }
  };

  const reset = async () => {
    try {
      const res = await fetch(`${API}/reset`, { method: 'POST' });
      const data = await res.json();
      setBalance(data.balance);
      setReels(['🍒', '🍒', '🍒']);
      setMessage('Καλή τύχη!');
      setIsWin(false);
      setAutoSpin(false);
      setConnected(true);
      setReelSpinStatuses([false, false, false]);
      setHasSpun(false);
    } catch {
      setMessage('❌ Αποτυχία σύνδεσης.');
    }
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>🎰 Φρουτάκια</h1>

      {!connected && (
        <div style={styles.errorBox}>
          Ξεκίνα το backend: <code>python -m uvicorn main:app --reload</code>
        </div>
      )}

      <div style={styles.balanceBoard}>
        Υπόλοιπο: <span style={{ color: '#ffd700', fontWeight: 'bold' }}>{balance} €</span>
      </div>

      <div style={{
        ...styles.slotMachine,
        border: isWin ? '5px solid #4caf50' : '5px solid #555',
        boxShadow: isWin ? '0 0 20px #4caf50' : '0 10px 30px rgba(0,0,0,0.5)',
      }}>
        {reels.map((sym, i) => {
          
          // Λογική Ρουλέτας: Υπολογισμός συμβόλων Πάνω, Μεσαίο, Κάτω
          const currentSymbolIndex = ALL_SYMBOLS.indexOf(sym);
          const totalSymbols = ALL_SYMBOLS.length;
          
          const prevSymbolIndex = (currentSymbolIndex - 1 + totalSymbols) % totalSymbols;
          const nextSymbolIndex = (currentSymbolIndex + 1) % totalSymbols;
          
          const prevSymbol = ALL_SYMBOLS[prevSymbolIndex];
          const nextSymbol = ALL_SYMBOLS[nextSymbolIndex];

          return (
            <div key={i} style={styles.reelWrapper}>
              <div style={{
                ...styles.reelContent,
                // Αν γυρίζει παίζει το rapidRoll, όταν σταματάει παίζει το stopBounce
                animation: reelSpinStatuses[i] 
                  ? 'rapidRoll 0.08s linear infinite' 
                  : (hasSpun ? 'stopBounce 0.5s cubic-bezier(0.25, 1, 0.5, 1)' : 'none'),
                filter: reelSpinStatuses[i] ? 'blur(3px)' : 'none',
              }}>
                {reelSpinStatuses[i] ? (
                  // Όταν γυρίζει, δείχνουμε το τρέχον σύμβολο και δύο τυχαία (όλα θολωμένα)
                  <>
                    <div style={styles.symbolItem}>{sym}</div>
                    <div style={styles.symbolItem}>{ALL_SYMBOLS[(i + 1) % ALL_SYMBOLS.length]}</div>
                    <div style={styles.symbolItem}>{ALL_SYMBOLS[(i + 2) % ALL_SYMBOLS.length]}</div>
                  </>
                ) : (
                  // Όταν είναι σταματημένο, δείχνουμε τη σειρά (Πάνω, Κεντρικό, Κάτω)
                  <>
                    <div style={styles.symbolItem}>{prevSymbol}</div>
                    <div style={styles.symbolItem}>{sym}</div>
                    <div style={styles.symbolItem}>{nextSymbol}</div>
                  </>
                )}
              </div>
              
              {/* Overlay Σκιά για 3D αίσθηση βάθους */}
              <div style={styles.reelOverlay}></div>
            </div>
          );
        })}
      </div>

      <div style={styles.controls}>
        <label style={{ color: '#aaa', fontSize: '14px' }}>Στοίχημα:</label>
        <input
          type="number"
          value={bet}
          onChange={e => setBet(e.target.value)}
          style={styles.input}
          min="1"
          max={balance}
          step="5"
          disabled={isSpinning || autoSpin}
        />
        
        <button
          onClick={spin}
          disabled={isSpinning || autoSpin || !connected || balance <= 0}
          style={isSpinning || autoSpin ? styles.buttonDisabled : styles.button}
        >
          {isSpinning ? '⏳' : 'SPIN'}
        </button>

        <button
          onClick={() => setAutoSpin(!autoSpin)}
          disabled={!connected || (balance <= 0 && !autoSpin)}
          style={{
            ...styles.button,
            backgroundColor: autoSpin ? '#2f3542' : '#ffa500',
            marginLeft: '10px',
            minWidth: '160px',
            fontSize: '1rem'
          }}
        >
          {autoSpin ? '🛑 STOP AUTO' : '🔄 AUTO SPIN'}
        </button>
      </div>

      <h2 style={{ color: isWin ? '#4caf50' : '#fff', textAlign: 'center', minHeight: '35px', marginTop: '15px' }}>
        {message}
      </h2>

      <button onClick={reset} style={styles.resetButton}>
        🔄 Reset (1000 €)
      </button>

      {/* Το Πινακάκι Πληρωμών (Paytable) ατόφιο */}
      <div style={styles.paytable}>
        <p style={{ color: '#aaa', margin: '0 0 12px', fontSize: '14px', textAlign: 'center' }}>
          Πίνακας αποδόσεων (3 ίδια)
        </p>
        {Object.entries(SYMBOLS_INFO).map(([sym, info]) => (
          <div key={sym} style={styles.paytableRow}>
            <span>{sym}{sym}{sym}</span>
            <span style={{ color: '#ffd700', fontWeight: 'bold' }}>x{info.payout}</span>
            <span style={{ color: '#888', fontSize: '12px' }}>{info.label}</span>
          </div>
        ))}
      </div>

      {/* Τα Animations */}
      <style>{`
        @keyframes rapidRoll {
          0% { transform: translateY(-110px); }
          100% { transform: translateY(0); }
        }
        @keyframes stopBounce {
          0% { transform: translateY(-60px); filter: blur(2px); }
          40% { transform: translateY(15px); filter: blur(0); }
          75% { transform: translateY(-5px); }
          100% { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

// Όλα τα στυλ με τα διπλάσια μεγέθη και flexboxes
const styles = {
  container: {
    backgroundColor: '#282c34', minHeight: '100vh', display: 'flex', flexDirection: 'column', 
    alignItems: 'center', justifyContent: 'center', color: 'white', fontFamily: 'sans-serif', padding: '20px',
  },
  title: { fontSize: '2.5rem', marginBottom: '16px', textShadow: '2px 2px #ff0000' },
  errorBox: {
    background: '#5c1a1a', border: '1px solid #e57373', borderRadius: '8px',
    padding: '10px 20px', marginBottom: '12px', fontSize: '14px', color: '#ffcdd2'
  },
  balanceBoard: {
    background: '#444', padding: '10px 30px', borderRadius: '50px',
    marginBottom: '20px', border: '2px solid #ffd700', fontSize: '18px'
  },
  slotMachine: {
    display: 'flex', background: '#111', padding: '20px', borderRadius: '15px', 
    gap: '10px', transition: 'all 0.3s ease-in-out'
  },
  reelWrapper: {
    width: '110px', 
    height: `${REEL_VIEWPORT_HEIGHT}px`, // Διπλάσιο Ύψος (220px)
    backgroundColor: '#fff', borderRadius: '10px', overflow: 'hidden', 
    position: 'relative', display: 'flex', flexDirection: 'column',
    justifyContent: 'center', alignItems: 'center'
  },
  reelContent: {
    display: 'flex', flexDirection: 'column', width: '100%'
  },
  symbolItem: {
    fontSize: '70px', 
    height: `${SYMBOL_HEIGHT}px`, // Σταθερό στα 110px
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#000', textShadow: '0 4px 10px rgba(0,0,0,0.3)', flexShrink: 0
  },
  reelOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    boxShadow: 'inset 0 25px 25px -15px rgba(0,0,0,0.9), inset 0 -25px 25px -15px rgba(0,0,0,0.9)',
    pointerEvents: 'none', borderRadius: '10px'
  },
  controls: { marginTop: '24px', display: 'flex', gap: '10px', alignItems: 'center' },
  input: {
    padding: '10px', fontSize: '1.1rem', width: '80px', textAlign: 'center', 
    borderRadius: '5px', border: '1px solid #555', background: '#333', color: '#fff',
  },
  button: {
    padding: '10px 36px', fontSize: '1.3rem', fontWeight: 'bold', backgroundColor: '#ff4757', 
    color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', minWidth: '140px', textAlign: 'center'
  },
  buttonDisabled: {
    padding: '10px 36px', fontSize: '1.3rem', backgroundColor: '#555', color: '#888',
    borderRadius: '5px', cursor: 'not-allowed', border: 'none', minWidth: '140px', textAlign: 'center'
  },
  resetButton: {
    background: 'transparent', border: '1px solid #555', color: '#aaa', 
    padding: '6px 18px', borderRadius: '5px', cursor: 'pointer', fontSize: '13px',
  },
  paytable: {
    marginTop: '24px', background: '#1e2229', borderRadius: '10px',
    padding: '16px 20px', width: '280px', border: '1px solid #444',
  },
  paytableRow: {
    display: 'flex', justifyContent: 'space-between', padding: '6px 0', 
    borderBottom: '1px solid #333', fontSize: '15px',
  },
};

export default App;