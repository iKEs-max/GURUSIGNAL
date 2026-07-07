'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  SignalHistoryEntry,
  getHistory,
  updateHistoryEntry,
  deleteHistoryEntry,
  clearHistory,
  getHistoryAccuracy,
} from '@/lib/signal-history';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  X,
  Check,
  Trash2,
  ChevronDown,
  ChevronUp,
  History,
  Target,
  BarChart3,
} from 'lucide-react';

const signalColors: Record<string, string> = {
  STRONG_BUY: 'text-emerald-400',
  BUY: 'text-emerald-400',
  HOLD: 'text-amber-400',
  SELL: 'text-red-400',
  STRONG_SELL: 'text-red-400',
};

const signalBgs: Record<string, string> = {
  STRONG_BUY: 'bg-emerald-500/15 border-emerald-500/30',
  BUY: 'bg-emerald-500/10 border-emerald-500/20',
  HOLD: 'bg-amber-500/10 border-amber-500/20',
  SELL: 'bg-red-500/10 border-red-500/20',
  STRONG_SELL: 'bg-red-500/15 border-red-500/30',
};

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

interface SignalHistoryProps {
  refreshKey?: number;
}

export default function SignalHistory({ refreshKey }: SignalHistoryProps) {
  const [history, setHistory] = useState<SignalHistoryEntry[]>([]);
  const [expanded, setExpanded] = useState(true);
  const [showConfirmClear, setShowConfirmClear] = useState(false);

  const loadHistory = useCallback(() => {
    setHistory(getHistory());
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory, refreshKey]);

  const handleDirectionChange = (id: string, direction: 'UP' | 'DOWN' | 'HOLD') => {
    const entry = history.find((h) => h.id === id);
    if (!entry) return;

    let correct: boolean | null = null;
    if (direction === 'UP') {
      correct = (entry.signalType === 'STRONG_BUY' || entry.signalType === 'BUY');
    } else if (direction === 'DOWN') {
      correct = (entry.signalType === 'STRONG_SELL' || entry.signalType === 'SELL');
    } else {
      correct = (entry.signalType === 'HOLD');
    }

    updateHistoryEntry(id, {
      verified: true,
      actualDirection: direction,
      signalCorrect: correct,
    });
    loadHistory();
  };

  const handleDelete = (id: string) => {
    deleteHistoryEntry(id);
    loadHistory();
  };

  const handleClearAll = () => {
    clearHistory();
    loadHistory();
    setShowConfirmClear(false);
  };

  const accuracy = getHistoryAccuracy();

  return (
    <Card className="bg-zinc-900/80 border border-zinc-800/50">
      <CardContent className="p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">
              Signal History
            </h3>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-800 text-zinc-500">
              {history.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {/* Accuracy badge */}
            {accuracy.total > 0 && accuracy.correct + accuracy.incorrect > 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                {accuracy.correct + accuracy.incorrect > 0
                  ? `${((accuracy.correct / (accuracy.correct + accuracy.incorrect)) * 100).toFixed(0)}%`
                  : '—'}{' '}
                accurate
              </span>
            )}
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {expanded && (
          <>
            {/* Accuracy summary bar */}
            {accuracy.total > 0 && (
              <div className="grid grid-cols-4 gap-2 mb-4 p-2.5 rounded-lg bg-zinc-950/60 border border-zinc-800/30">
                <div className="text-center">
                  <p className="text-[10px] text-zinc-600 uppercase">Total</p>
                  <p className="text-sm font-bold text-zinc-300">{accuracy.total}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-zinc-600 uppercase">Correct</p>
                  <p className="text-sm font-bold text-emerald-400">{accuracy.correct}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-zinc-600 uppercase">Wrong</p>
                  <p className="text-sm font-bold text-red-400">{accuracy.incorrect}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-zinc-600 uppercase">Pending</p>
                  <p className="text-sm font-bold text-amber-400">{accuracy.pending}</p>
                </div>
              </div>
            )}

            {/* History list */}
            {history.length === 0 ? (
              <div className="text-center py-8">
                <BarChart3 className="w-8 h-8 text-zinc-800 mx-auto mb-2" />
                <p className="text-xs text-zinc-600">No signals recorded yet.</p>
                <p className="text-[10px] text-zinc-700 mt-1">Signals are logged automatically every refresh.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto scrollbar-none">
                {history.map((entry) => (
                  <div
                    key={entry.id}
                    className={`p-3 rounded-lg border ${signalBgs[entry.signalType] || 'bg-zinc-800/50 border-zinc-800/50'}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-zinc-200">
                          {entry.symbol.replace('USDT', '')}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800/80 text-zinc-500">
                          {entry.interval}
                        </span>
                        <span className={`text-xs font-bold ${signalColors[entry.signalType]}`}>
                          {entry.signalType.replace('_', ' ')}
                        </span>
                        {entry.verified && entry.signalCorrect !== null && (
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                              entry.signalCorrect
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : 'bg-red-500/20 text-red-400'
                            }`}
                          >
                            {entry.signalCorrect ? '✓ Correct' : '✗ Wrong'}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-zinc-600">
                          {formatDate(entry.timestamp)} {formatTime(entry.timestamp)}
                        </span>
                        <button
                          onClick={() => handleDelete(entry.id)}
                          className="text-zinc-700 hover:text-red-400 transition-colors p-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Price info */}
                    <div className="flex items-center gap-3 text-[10px] text-zinc-500 mb-2 font-mono">
                      <span>Entry: ${entry.entryPrice.toLocaleString()}</span>
                      <span className="text-red-400/60">SL: ${entry.stopLoss.toLocaleString()}</span>
                      <span className="text-emerald-400/60">TP: ${entry.takeProfit.toLocaleString()}</span>
                      <span className="text-zinc-600">|</span>
                      <span>Up: {entry.upProbability}%</span>
                    </div>

                    {/* Verification checkboxes */}
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-zinc-600 shrink-0">What happened?</span>
                      <div className="flex items-center gap-1">
                        {(['UP', 'DOWN', 'HOLD'] as const).map((dir) => (
                          <button
                            key={dir}
                            onClick={() => handleDirectionChange(entry.id, dir)}
                            className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-all border ${
                              entry.actualDirection === dir
                                ? dir === 'UP'
                                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                                  : dir === 'DOWN'
                                  ? 'bg-red-500/20 border-red-500/40 text-red-400'
                                  : 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                                : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-400'
                            }`}
                          >
                            {dir === 'UP' && <TrendingUp className="w-3 h-3" />}
                            {dir === 'DOWN' && <TrendingDown className="w-3 h-3" />}
                            {dir === 'HOLD' && <Minus className="w-3 h-3" />}
                            {dir}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Clear button */}
            {history.length > 0 && (
              <div className="mt-3 pt-3 border-t border-zinc-800/30">
                {!showConfirmClear ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowConfirmClear(true)}
                    className="w-full text-zinc-600 hover:text-red-400 hover:bg-red-500/5 text-xs h-8"
                  >
                    <Trash2 className="w-3 h-3 mr-1.5" />
                    Clear All History
                  </Button>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-zinc-500 flex-1">Are you sure?</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClearAll}
                      className="text-red-400 hover:bg-red-500/10 text-xs h-7 px-3"
                    >
                      Yes, clear
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowConfirmClear(false)}
                      className="text-zinc-500 hover:text-zinc-300 text-xs h-7 px-3"
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}