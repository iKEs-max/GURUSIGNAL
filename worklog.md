---
Task ID: 1
Agent: Main Agent
Task: Build GuruSignals - AI Crypto Futures Trading Signals Dashboard

Work Log:
- Installed lightweight-charts v5 for professional candlestick charting
- Built technical indicators library (src/lib/indicators.ts): EMA, SMA, RSI, MACD, Bollinger Bands, ATR, Volume SMA
- Built AI hybrid signal engine (src/lib/signals.ts): 6 weighted indicators → composite score → STRONG_BUY/BUY/HOLD/SELL/STRONG_SELL + SL/TP via ATR
- Built API route (src/app/api/market/route.ts): fetches Binance public kline data, runs analysis, returns chart data + signals
- Built candlestick chart component (src/components/candlestick-chart.tsx): TradingView lightweight-charts v5 API with EMA 9/21, Bollinger Bands, volume overlay
- Built signal card component (src/components/signal-card.tsx): signal type, confidence, score bar, entry/SL/TP, reasoning
- Built indicator panel component (src/components/indicator-panel.tsx): per-indicator score bars + extra stats
- Built main page (src/app/page.tsx): search bar with suggestions, price header, chart, signal cards, 5-minute auto-refresh with countdown timer
- Fixed lightweight-charts v5 API compatibility (addSeries instead of addCandlestickSeries)
- Fixed missing volumeSMA import
- Verified via browser: BTC and ETH search work, chart renders, signals display, indicators show

Stage Summary:
- Fully functional crypto futures trading signal dashboard
- Binance public API (no keys needed) for real-time 5m kline data
- Level 3 Hybrid AI engine: RSI + MACD + Bollinger + EMA Cross + Volume + Momentum → weighted composite score
- Auto-refreshes every 5 minutes with visible countdown
- Clean minimal dark theme optimized for trading