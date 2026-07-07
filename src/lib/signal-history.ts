// Signal History Manager
// Stores past signals in localStorage for tracking and verification

export type SignalTypeLabel = 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL';

export interface SignalHistoryEntry {
  id: string;                    // unique ID
  timestamp: number;             // when signal was generated (epoch ms)
  symbol: string;                // e.g. "BTCUSDT"
  interval: string;              // e.g. "5m"
  signalType: SignalTypeLabel;   // BUY, SELL, etc.
  score: number;                 // -100 to +100
  confidence: number;            // 0-1
  upProbability: number;         // 0-100
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  // Verification fields (set by user)
  verified: boolean;
  actualDirection: 'UP' | 'DOWN' | 'HOLD' | null;  // what actually happened
  signalCorrect: boolean | null;  // was the signal correct?
}

const STORAGE_KEY = 'gurusignals_history';
const MAX_ENTRIES = 200;

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function getHistory(): SignalHistoryEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SignalHistoryEntry[];
  } catch {
    return [];
  }
}

export function addHistoryEntry(entry: Omit<SignalHistoryEntry, 'id' | 'timestamp' | 'verified' | 'actualDirection' | 'signalCorrect'>): SignalHistoryEntry {
  const full: SignalHistoryEntry = {
    ...entry,
    id: generateId(),
    timestamp: Date.now(),
    verified: false,
    actualDirection: null,
    signalCorrect: null,
  };

  const history = getHistory();
  history.unshift(full);

  // Trim to max
  if (history.length > MAX_ENTRIES) {
    history.length = MAX_ENTRIES;
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch {
    // localStorage full — clear oldest half
    history.length = Math.floor(MAX_ENTRIES / 2);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch {
      // give up silently
    }
  }

  return full;
}

export function updateHistoryEntry(id: string, updates: Partial<Pick<SignalHistoryEntry, 'verified' | 'actualDirection' | 'signalCorrect'>>): void {
  const history = getHistory();
  const idx = history.findIndex((h) => h.id === id);
  if (idx === -1) return;

  history[idx] = { ...history[idx], ...updates };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch {
    // silent
  }
}

export function deleteHistoryEntry(id: string): void {
  const history = getHistory().filter((h) => h.id !== id);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch {
    // silent
  }
}

export function clearHistory(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // silent
  }
}

export function getHistoryAccuracy(): { total: number; correct: number; incorrect: number; pending: number } {
  const history = getHistory();
  const verified = history.filter((h) => h.verified);
  const correct = verified.filter((h) => h.signalCorrect === true).length;
  const incorrect = verified.filter((h) => h.signalCorrect === false).length;
  return {
    total: history.length,
    correct,
    incorrect,
    pending: history.length - verified.length,
  };
}

// Score history for sparkline (last N scores per symbol+interval)
const SCORE_HISTORY_KEY = 'gurusignals_score_history';
const MAX_SCORE_ENTRIES = 50;

export interface ScoreSnapshot {
  timestamp: number;
  symbol: string;
  interval: string;
  score: number;
}

export function getScoreHistory(symbol: string, interval: string): ScoreSnapshot[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(SCORE_HISTORY_KEY);
    if (!raw) return [];
    const all: ScoreSnapshot[] = JSON.parse(raw);
    return all.filter((s) => s.symbol === symbol && s.interval === interval);
  } catch {
    return [];
  }
}

export function addScoreSnapshot(snapshot: Omit<ScoreSnapshot, 'timestamp'>): void {
  const entry: ScoreSnapshot = { ...snapshot, timestamp: Date.now() };
  try {
    const raw = localStorage.getItem(SCORE_HISTORY_KEY);
    let all: ScoreSnapshot[] = raw ? JSON.parse(raw) : [];
    all.push(entry);
    // Trim old entries
    if (all.length > MAX_SCORE_ENTRIES) {
      all = all.slice(all.length - MAX_SCORE_ENTRIES);
    }
    localStorage.setItem(SCORE_HISTORY_KEY, JSON.stringify(all));
  } catch {
    // silent
  }
}