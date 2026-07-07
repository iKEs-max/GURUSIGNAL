'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Search,
  RefreshCw,
  Clock,
  TrendingUp,
  TrendingDown,
  Activity,
  Zap,
  ChevronDown,
  ChevronUp,
  Bell,
  BellOff,
  Sun,
  Moon,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import SignalCard from '@/components/signal-card';
import IndicatorPanel from '@/components/indicator-panel';
import SignalHistory from '@/components/signal-history';
import { addHistoryEntry, addScoreSnapshot } from '@/lib/signal-history';
import { fetchKlines, fetchFundingRate } from '@/lib/binance-client';
import type { FullAnalysis } from '@/lib/signals';

// Dynamic import for chart (no SSR)
const CandlestickChart = dynamic(() => import('@/components/candlestick-chart'), {
  ssr: false,
  loading: () => (
    <Skeleton className="w-full h-[500px] rounded-xl bg-zinc-900" />
  ),
});

interface MarketData {
  symbol: string;
  interval: string;
  candles: {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }[];
  analysis: FullAnalysis;
  fundingRate?: number | null;
  fetchedAt: string;
}

const SEARCH_COINS = [
  { symbol: 'BTCUSDT',  name: 'Bitcoin' },
  { symbol: 'ETHUSDT',  name: 'Ethereum' },
  { symbol: 'SOLUSDT',  name: 'Solana' },
  { symbol: 'XRPUSDT',  name: 'XRP' },
  { symbol: 'ADAUSDT',  name: 'Cardano' },
  { symbol: 'TRXUSDT',  name: 'Tron' },
  { symbol: 'XLMUSDT',  name: 'Stellar Lumens' },
  { symbol: 'HBARUSDT', name: 'Hedera Hashgraph' },
  { symbol: 'XVGUSDT',  name: 'Verge' },
  { symbol: 'IOTAUSDT',  name: 'IOTA' },
  { symbol: 'SXTUSDT',  name: 'Space & Time' },
  { symbol: 'BNBUSDT',  name: 'BNB' },
  { symbol: 'DOGEUSDT', name: 'Dogecoin' },
  { symbol: 'AVAXUSDT', name: 'Avalanche' },
  { symbol: 'SLXUSDT',  name: 'SLX' },
];

const WATCHLIST = [
  { symbol: 'ETHUSDT',  name: 'Ethereum',       ticker: 'ETH' },
  { symbol: 'SOLUSDT',  name: 'Solana',         ticker: 'SOL' },
  { symbol: 'XRPUSDT',  name: 'XRP',            ticker: 'XRP' },
  { symbol: 'ADAUSDT',  name: 'Cardano',        ticker: 'ADA' },
  { symbol: 'TRXUSDT',  name: 'Tron',           ticker: 'TRX' },
  { symbol: 'XLMUSDT',  name: 'Stellar',        ticker: 'XLM' },
  { symbol: 'HBARUSDT', name: 'Hedera',         ticker: 'HBAR' },
  { symbol: 'XVGUSDT',  name: 'Verge',          ticker: 'XVG' },
  { symbol: 'IOTAUSDT', name: 'IOTA',           ticker: 'IOTA' },
  { symbol: 'SXTUSDT',  name: 'Space & Time',   ticker: 'SXT' },
  { symbol: 'SLXUSDT',  name: 'SLX',             ticker: 'SLX' },
];

const INTERVALS = [
  { value: '1m',  label: '1m',  countdown: 60 },
  { value: '5m',  label: '5m',  countdown: 300 },
  { value: '15m', label: '15m', countdown: 900 },
] as const;

const BULLISH_SIGNALS = ['STRONG_BUY', 'BUY'];
const BEARISH_SIGNALS = ['STRONG_SELL', 'SELL'];

export default function Home() {
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [inputValue, setInputValue] = useState('BTCUSDT');
  const [data, setData] = useState<MarketData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [interval, setInterval_] = useState('5m');
  const [countdown, setCountdown] = useState(300);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showChartLegend, setShowChartLegend] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
  const prevSignalRef = useRef<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Close search dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Theme toggle
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  // Get countdown for current interval
  const currentIntervalConfig = INTERVALS.find((i) => i.value === interval) || INTERVALS[1];

  const fetchData = useCallback(async (sym: string, intv: string) => {
    setLoading(true);
    setError(null);
    try {
      // Step 1: Fetch raw kline data directly from Binance (client-side)
      const klines = await fetchKlines(sym, intv, 200);

      // Step 2: Fetch funding rate in parallel (optional)
      const fundingRatePromise = fetchFundingRate(sym);

      // Step 3: Send raw data to our API for signal generation
      const fundingRate = await fundingRatePromise;
      const res = await fetch('/api/market', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ klines, symbol: sym, interval: intv, fundingRate }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Failed to generate signals');
        setData(null);
      } else {
        setData(json);

        // Log to signal history
        if (json.analysis?.signal) {
          const sig = json.analysis.signal;
          addHistoryEntry({
            symbol: sym,
            interval: intv,
            signalType: sig.type,
            score: sig.score,
            confidence: sig.confidence,
            upProbability: sig.upProbability,
            entryPrice: sig.entryPrice,
            stopLoss: sig.stopLoss,
            takeProfit: sig.takeProfit,
          });

          // Log score for sparkline
          addScoreSnapshot({ symbol: sym, interval: intv, score: sig.score });

          // Check for signal flip and notify
          const prevType = prevSignalRef.current;
          if (prevType && prevType !== sig.type) {
            const prevBull = BULLISH_SIGNALS.includes(prevType);
            const currBull = BULLISH_SIGNALS.includes(sig.type);
            const prevBear = BEARISH_SIGNALS.includes(prevType);
            const currBear = BEARISH_SIGNALS.includes(sig.type);

            // Significant flip: bullish→bearish or bearish→bullish or any→strong
            const isSignificantFlip =
              (prevBull && currBear) ||
              (prevBear && currBull) ||
              sig.type === 'STRONG_BUY' ||
              sig.type === 'STRONG_SELL';

            if (isSignificantFlip && notificationsEnabled && 'Notification' in window) {
              const coinName = sym.replace('USDT', '');
              const notification = new Notification(`GuruSignals — ${coinName}`, {
                body: `Signal flipped to ${sig.type.replace('_', ' ')} (${sig.score >= 0 ? '+' : ''}${sig.score}) | Up: ${sig.upProbability}%`,
                icon: '/icon-192.png',
                tag: `gurusignal-${sym}-${intv}`,
              });
              notification.onclick = () => {
                window.focus();
                notification.close();
              };
            }
          }
          prevSignalRef.current = sig.type;
          setHistoryRefreshKey((k) => k + 1);
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(`Network error: ${msg}`);
      setData(null);
    } finally {
      setLoading(false);
      setCountdown(currentIntervalConfig.countdown);
    }
  }, [currentIntervalConfig.countdown, notificationsEnabled]);

  // Initial fetch
  useEffect(() => {
    prevSignalRef.current = null;
    fetchData(symbol, interval);
  }, [symbol, interval, fetchData]);

  // Auto-refresh countdown
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          fetchData(symbol, interval);
          return currentIntervalConfig.countdown;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [symbol, interval, fetchData, currentIntervalConfig.countdown]);

  // Request notification permission
  const requestNotifications = async () => {
    if (!('Notification' in window)) return;
    const permission = await Notification.requestPermission();
    setNotificationsEnabled(permission === 'granted');
  };

  const handleSearch = () => {
    const cleaned = inputValue.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (cleaned) {
      setSymbol(cleaned);
      setShowSuggestions(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const handleCoinClick = (coin: string) => {
    setInputValue(coin);
    setSymbol(coin);
    setShowSuggestions(false);
  };

  const handleIntervalChange = (intv: string) => {
    setInterval_(intv);
  };

  const formatCountdown = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const priceChange = data?.analysis.priceChange24h;
  const isPositive = priceChange !== null && priceChange !== undefined && priceChange >= 0;

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100 gs-theme-bg gs-theme-text">
      {/* Header */}
      <header className="border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-50 gs-theme-header gs-theme-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-400" />
              <h1 className="text-lg font-bold tracking-tight">
                <span className="text-amber-400">Guru</span>
                <span className="text-zinc-400">Signals</span>
              </h1>
            </div>
            <span className="hidden sm:inline-block text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium uppercase tracking-wider">
              Futures
            </span>
          </div>

          {/* Search */}
          <div ref={searchContainerRef} className="relative flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <Input
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value);
                  setShowSuggestions(true);
                }}
                onKeyDown={handleKeyDown}
                onFocus={() => setShowSuggestions(true)}
                placeholder="Search coin pair (e.g. BTCUSDT)"
                className="pl-10 pr-10 h-9 bg-zinc-900 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 text-sm rounded-lg focus-visible:ring-amber-500/30 focus-visible:border-amber-500/30"
              />
              <Button
                onClick={handleSearch}
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 px-3 bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs rounded-md"
              >
                Go
              </Button>
            </div>

            {/* Suggestions */}
            {showSuggestions && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-900 border border-zinc-800 rounded-lg shadow-2xl z-50 overflow-hidden max-h-72 overflow-y-auto scrollbar-none">
                {SEARCH_COINS.filter((c) => {
                  if (!inputValue) return true;
                  const q = inputValue.toUpperCase();
                  return c.symbol.includes(q) || c.name.toUpperCase().includes(q);
                }).map((coin) => (
                  <button
                    key={coin.symbol}
                    onClick={() => handleCoinClick(coin.symbol)}
                    className="w-full px-3 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-800 transition-colors flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <Activity className="w-3.5 h-3.5 text-amber-500/60" />
                      <span className="font-medium text-zinc-100">{coin.symbol.replace('USDT','')}</span>
                      <span className="text-zinc-600">/USDT</span>
                    </div>
                    <span className="text-xs text-zinc-600">{coin.name}</span>
                  </button>
                ))}
                {inputValue && SEARCH_COINS.filter((c) => {
                  const q = inputValue.toUpperCase();
                  return c.symbol.includes(q) || c.name.toUpperCase().includes(q);
                }).length === 0 && (
                  <div className="px-3 py-2 text-xs text-zinc-600">No matches — press Enter to search anyway</div>
                )}
              </div>
            )}
          </div>

          {/* Interval Selector + Refresh + Timer + Notifications */}
          <div className="flex items-center gap-2">
            {/* Interval buttons */}
            <div className="hidden sm:flex items-center bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
              {INTERVALS.map((intv) => (
                <button
                  key={intv.value}
                  onClick={() => handleIntervalChange(intv.value)}
                  className={`px-2.5 py-1.5 text-xs font-medium transition-all ${
                    interval === intv.value
                      ? 'bg-amber-500/15 text-amber-400'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {intv.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5 text-xs text-zinc-500">
              <Clock className="w-3.5 h-3.5" />
              <span className="font-mono">{formatCountdown(countdown)}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fetchData(symbol, interval)}
              disabled={loading}
              className="h-8 w-8 p-0 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <button
              onClick={requestNotifications}
              className={`h-8 w-8 flex items-center justify-center rounded-md transition-colors ${
                notificationsEnabled
                  ? 'text-amber-400 hover:bg-zinc-800'
                  : 'text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800'
              }`}
              title={notificationsEnabled ? 'Notifications on' : 'Click to enable alerts'}
            >
              {notificationsEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setIsDark(!isDark)}
              className="h-8 w-8 flex items-center justify-center rounded-md text-zinc-500 hover:text-amber-400 hover:bg-zinc-800 transition-colors"
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* Watchlist Bar */}
      <div className="border-b border-zinc-800/50 bg-zinc-950/60 gs-theme-watchlist gs-theme-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center gap-2 py-2.5 overflow-x-auto scrollbar-none">
            <span className="text-[10px] uppercase tracking-wider text-zinc-600 font-medium shrink-0 mr-1">
              Watchlist
            </span>
            {WATCHLIST.map((coin) => {
              const isActive = symbol === coin.symbol;
              return (
                <button
                  key={coin.symbol}
                  onClick={() => handleCoinClick(coin.symbol)}
                  className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 flex items-center gap-1.5 border ${
                    isActive
                      ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                      : 'bg-zinc-900/60 border-zinc-800/50 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700 hover:bg-zinc-800/60'
                  }`}
                >
                  <span className="font-bold">{coin.ticker}</span>
                  <span className="hidden sm:inline text-zinc-600">{coin.name}</span>
                </button>
              );
            })}
            {/* Mobile interval selector */}
            <div className="sm:hidden flex items-center gap-1 ml-auto shrink-0">
              {INTERVALS.map((intv) => (
                <button
                  key={intv.value}
                  onClick={() => handleIntervalChange(intv.value)}
                  className={`px-2 py-1 rounded text-[10px] font-medium transition-all border ${
                    interval === intv.value
                      ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                      : 'bg-zinc-900/60 border-zinc-800/50 text-zinc-500'
                  }`}
                >
                  {intv.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        {loading && !data && (
          <div className="space-y-6">
            <div className="flex items-center gap-6">
              <Skeleton className="h-10 w-40 bg-zinc-900 rounded-lg" />
              <Skeleton className="h-6 w-24 bg-zinc-900 rounded" />
            </div>
            <Skeleton className="w-full h-[500px] rounded-xl bg-zinc-900" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Skeleton className="h-60 bg-zinc-900 rounded-xl" />
              <Skeleton className="h-60 bg-zinc-900 rounded-xl" />
              <Skeleton className="h-60 bg-zinc-900 rounded-xl" />
            </div>
          </div>
        )}

        {data && (
          <>
            {/* Price Header */}
            <div className="mb-6 flex flex-wrap items-end gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-2xl font-bold">{data.symbol}</h2>
                  <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 font-medium">{interval}</span>
                  <span className="text-xs text-zinc-600">Perpetual Futures</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-3xl font-mono font-bold">
                    ${data.analysis.currentPrice.toLocaleString()}
                  </span>
                  {priceChange !== null && priceChange !== undefined && (
                    <span
                      className={`flex items-center gap-0.5 text-sm font-semibold px-2 py-0.5 rounded ${
                        isPositive
                          ? 'text-emerald-400 bg-emerald-500/10'
                          : 'text-red-400 bg-red-500/10'
                      }`}
                    >
                      {isPositive ? (
                        <TrendingUp className="w-3.5 h-3.5" />
                      ) : (
                        <TrendingDown className="w-3.5 h-3.5" />
                      )}
                      {isPositive ? '+' : ''}{priceChange.toFixed(2)}%
                    </span>
                  )}
                </div>
              </div>

              {/* Legend toggle */}
              <button
                onClick={() => setShowChartLegend(!showChartLegend)}
                className="ml-auto flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                Chart Legend
                {showChartLegend ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            </div>

            {/* Chart Legend */}
            {showChartLegend && (
              <div className="mb-4 flex flex-wrap items-center gap-4 text-xs text-zinc-500">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-0.5 bg-amber-400 rounded" />
                  <span>EMA 9</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-0.5 bg-cyan-400 rounded" />
                  <span>EMA 21</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-0.5 bg-purple-400/60 rounded border-dashed border border-purple-400/40" style={{ borderTop: '1px dashed rgba(168,85,247,0.6)' }} />
                  <span>Bollinger Bands</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-2 bg-emerald-500/60 rounded-sm" />
                  <span>Buy Volume</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-2 bg-red-500/60 rounded-sm" />
                  <span>Sell Volume</span>
                </div>
              </div>
            )}

            {/* Chart */}
            <div className="mb-6">
              <CandlestickChart candles={data.candles} />
            </div>

            {/* Signal + Indicators Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Signal Card - takes 2 cols */}
              <div className="lg:col-span-2">
                <SignalCard signal={data.analysis.signal} symbol={symbol} interval={interval} />
              </div>

              {/* Indicator Panel */}
              <div>
                <IndicatorPanel analysis={data.analysis} fundingRate={data.fundingRate} />
              </div>
            </div>

            {/* Signal History */}
            <div className="mt-6">
              <SignalHistory refreshKey={historyRefreshKey} />
            </div>

            {/* Footer info */}
            <div className="mt-8 text-center text-[11px] text-zinc-700 pb-4">
              <p>Signals are generated using a hybrid technical analysis engine (RSI, MACD, Bollinger Bands, EMA, Volume, Momentum).</p>
              <p className="mt-1">This is not financial advice. Always do your own research before trading.</p>
              <p className="mt-1">Data from Binance · Auto-refreshes every {interval}</p>
            </div>
          </>
        )}

        {/* Empty state */}
        {!data && !loading && !error && (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <Zap className="w-12 h-12 text-zinc-800 mb-4" />
            <h3 className="text-lg font-semibold text-zinc-400 mb-2">Search for a Coin</h3>
            <p className="text-sm text-zinc-600 max-w-sm">
              Enter a trading pair like <span className="text-zinc-400 font-mono">BTCUSDT</span> or{' '}
              <span className="text-zinc-400 font-mono">ETHUSDT</span> to see live signals and analysis.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}