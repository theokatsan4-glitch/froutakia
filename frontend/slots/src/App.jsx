import React, { useState, useEffect } from 'react';

const API = 'http://localhost:8000';

const SYMBOLS_INFO = {
  "💎": { payout: 50, label: "σπάνιο" },
  "⭐": { payout: 20, label: "σπάνιο" },
  "🔔": { payout: 10, label: "μέτριο" },
  "🍋": { payout: 5,  label: "συχνό" },
  "🍒": { payout: 2,  label: "πολύ συχνό" },
};

function App() {
  const [reels, setReels]           = useState(['🍒', '🍒', '🍒']);
  const [balance, setBalance]       = useState(0);
  const [bet, setBet]               = useState(10);
  const [message, setMessage]       = useState('Καλή τύχη!');
  const [isSpinning, setIsSpinning] = useState(false);
  const [isWin, setIsWin]           = useState(false);
  const [connected, setConnected]   = useState(true);

  useEffect(() => {
    fetch(`${API}/status`)
      .then(res => res.json())
      .then(data => setBalance(data.balance))
      .catch(() => {
        setConnected(false);
        setMessage('❌ Δεν βρέθηκε το backend! Τρέξε: python -m uvicorn main:app --reload');
      });
  }, []);

  const spin = async () => {
    if (isSpinning || !connected) return;

    const betValue = parseInt(bet, 10);
    if (isNaN(betValue) || betValue <= 0) {
      setMessage('⚠️ Βάλε ένα θετικό ποντάρισμα.');
      return;
    }
    if (betValue > balance) {
      setMessage('⚠️ Δεν έχεις αρκετό υπόλοιπο!');
      return;
    }

    setIsSpinning(true);
    setIsWin(false);
    setMessage('Περιστροφή...');

    try {
      const response = await fetch(`${API}/spin?bet=${betValue}`, { method: 'POST' });
      const data = await response.json();

      if (!response.ok) {
        setMessage(`⚠️ ${data.detail}`);
        setIsSpinning(false);
        return;
      }

      setTimeout(() => {
        setReels(data.reels);
        setBalance(data.new_balance);
        setIsSpinning(false);
        setIsWin(data.is_win);

        if (data.is_win) {
          setMessage(`🎉 ΚΕΡΔΙΣΕΣ ${data.win_amount} €!`);
        } else if (data.new_balance <= 0) {
          setMessage('Δεν έχεις άλλα χρήματα! Πάτα Reset.');
        } else {
          setMessage('Δοκίμασε ξανά!');
        }
      }, 600);

    } catch (err) {
      setMessage('❌ Δεν βρέθηκε το backend!');
      setIsSpinning(false);
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
      setConnected(true);
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
        transition: 'border-color 0.3s'
      }}>
        {reels.map((sym, i) => (
          <div key={i} style={{
            ...styles.reel,
            animation: isSpinning ? 'spin 0.1s infinite alternate' : 'none',
            animationDelay: `${i * 0.05}s`,
          }}>
            {sym}
          </div>
        ))}
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
          disabled={isSpinning}
        />
        <button
          onClick={spin}
          disabled={isSpinning || !connected || balance <= 0}
          style={isSpinning ? styles.buttonDisabled : styles.button}
        >
          {isSpinning ? '⏳' : 'SPIN'}
        </button>
      </div>

      <h2 style={{ color: isWin ? '#4caf50' : '#fff', textAlign: 'center' }}>
        {message}
      </h2>

      <button onClick={reset} style={styles.resetButton}>
        🔄 Reset (1000 €)
      </button>

      <div style={styles.paytable}>
        <p style={{ color: '#aaa', margin: '0 0 8px', fontSize: '13px' }}>Πίνακας αποδόσεων (3 ίδια)</p>
        {Object.entries(SYMBOLS_INFO).map(([sym, info]) => (
          <div key={sym} style={styles.paytableRow}>
            <span>{sym}{sym}{sym}</span>
            <span style={{ color: '#ffd700' }}>x{info.payout}</span>
            <span style={{ color: '#888', fontSize: '12px' }}>{info.label}</span>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: translateY(-3px); }
          to   { transform: translateY(3px); }
        }
      `}</style>
    </div>
  );
}

const styles = {
  container: {
    backgroundColor: '#282c34', minHeight: '100vh',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', color: 'white', fontFamily: 'sans-serif',
    padding: '20px',
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
    display: 'flex', background: '#111', padding: '20px',
    borderRadius: '15px', gap: '10px',
  },
  reel: {
    fontSize: '70px', width: '110px', height: '110px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#fff', borderRadius: '10px',
  },
  controls: { marginTop: '24px', display: 'flex', gap: '10px', alignItems: 'center' },
  input: {
    padding: '10px', fontSize: '1.1rem', width: '80px',
    textAlign: 'center', borderRadius: '5px', border: '1px solid #555',
    background: '#333', color: '#fff',
  },
  button: {
    padding: '10px 36px', fontSize: '1.3rem', fontWeight: 'bold',
    backgroundColor: '#ff4757', color: 'white', border: 'none',
    borderRadius: '5px', cursor: 'pointer',
  },
  buttonDisabled: {
    padding: '10px 36px', fontSize: '1.3rem',
    backgroundColor: '#555', color: '#888',
    borderRadius: '5px', cursor: 'not-allowed', border: 'none',
  },
  resetButton: {
    marginTop: '12px', background: 'transparent', border: '1px solid #555',
    color: '#aaa', padding: '6px 18px', borderRadius: '5px',
    cursor: 'pointer', fontSize: '13px',
  },
  paytable: {
    marginTop: '24px', background: '#1e2229', borderRadius: '10px',
    padding: '14px 20px', width: '280px', border: '1px solid #444',
  },
  paytableRow: {
    display: 'flex', justifyContent: 'space-between',
    padding: '4px 0', borderBottom: '1px solid #333', fontSize: '14px',
  },
};

export default App;
