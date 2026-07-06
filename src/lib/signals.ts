// AI-Hybrid Signal Engine
// Combines multiple technical indicators into a composite score
// and generates Buy/Sell signals with Stop Loss & Take Profit levels

import { Candle, ema, rsi, macd, bollingerBands, atr, sma, volumeSMA } from './indicators';

export type SignalType = 'STRONG_BUY' | 'BUY' | 'HOLD' | 'SELL' | 'STRONG_SELL';

export interface Signal {
  type: SignalType;
  score: number;           // -100 to +100
  confidence: number;      // 0 to 1
  stopLoss: number;
  takeProfit: number;
  entryPrice: number;
  reasoning: string[];
}

export interface IndicatorScores {
  rsi: number;
  macd: number;
  bollinger: number;
  ema: number;
  volume: number;
  momentum: number;
}

export interface FullAnalysis {
  signal: Signal;
  indicators: IndicatorScores;
  currentPrice: number;
  rsiValue: number | null;
  macdValue: number | null;
  macdSignal: number | null;
  macdHistogram: number | null;
  bollingerUpper: number | null;
  bollingerMiddle: number | null;
  bollingerLower: number | null;
  ema9: number | null;
  ema21: number | null;
  atrValue: number | null;
  priceChange24h: number | null;
  volumeAvg: number | null;
  currentVolume: number | null;
}

export function generateSignals(candles: Candle[]): FullAnalysis | null {
  if (candles.length < 50) return null;

  const closes = candles.map((c) => c.close);
  const volumes = candles.map((c) => c.volume);
  const lastIdx = closes.length - 1;
  const currentPrice = closes[lastIdx];

  // ── Calculate all indicators ──────────────────────────────
  const rsiValues = rsi(closes, 14);
  const macdResult = macd(closes, 12, 26, 9);
  const bb = bollingerBands(closes, 20, 2);
  const ema9Values = ema(closes, 9);
  const ema21Values = ema(closes, 21);
  const atrValues = atr(candles, 14);
  const volSma = volumeSMA(volumes, 20);

  const rsiVal = rsiValues[lastIdx];
  const macdVal = macdResult.macd[lastIdx];
  const macdSig = macdResult.signal[lastIdx];
  const macdHist = macdResult.histogram[lastIdx];
  const bbUpper = bb.upper[lastIdx];
  const bbMiddle = bb.middle[bb.middle.length - 1] ?? null;
  const bbLower = bb.lower[lastIdx];
  const ema9Val = ema9Values[lastIdx];
  const ema21Val = ema21Values[lastIdx];
  const atrVal = atrValues[lastIdx];
  const volAvg = volSma[volSma.length - 1] ?? null;
  const currentVol = volumes[lastIdx];

  // ── Score each indicator (-100 to +100) ───────────────────

  // 1. RSI Score
  let rsiScore = 0;
  if (!isNaN(rsiVal)) {
    if (rsiVal < 30) rsiScore = 60 + (30 - rsiVal) * 1.5;      // Oversold → bullish
    else if (rsiVal < 40) rsiScore = 30 + (40 - rsiVal) * 3;
    else if (rsiVal < 60) rsiScore = (50 - rsiVal) * -1.5;     // Neutral zone
    else if (rsiVal < 70) rsiScore = -30 - (rsiVal - 60) * 3;
    else rsiScore = -60 - (rsiVal - 70) * 1.5;                  // Overbought → bearish
    rsiScore = Math.max(-100, Math.min(100, rsiScore));
  }

  // 2. MACD Score
  let macdScore = 0;
  if (!isNaN(macdVal) && !isNaN(macdSig)) {
    const histNorm = macdHist || 0;
    const prevHist = macdResult.histogram[lastIdx - 1] || 0;
    // MACD line above signal → bullish
    if (macdVal > macdSig) {
      macdScore = Math.min(60, 30 + (histNorm / (currentPrice * 0.001)) * 10);
    } else {
      macdScore = Math.max(-60, -30 + (histNorm / (currentPrice * 0.001)) * 10);
    }
    // Histogram momentum (increasing/decreasing)
    if (histNorm > prevHist) macdScore += 15;
    else if (histNorm < prevHist) macdScore -= 15;
    // Crossover bonus
    const prevMacd = macdResult.macd[lastIdx - 1];
    const prevSig = macdResult.signal[lastIdx - 1];
    if (!isNaN(prevMacd) && !isNaN(prevSig)) {
      if (prevMacd < prevSig && macdVal > macdSig) macdScore += 25; // Bullish cross
      if (prevMacd > prevSig && macdVal < macdSig) macdScore -= 25; // Bearish cross
    }
    macdScore = Math.max(-100, Math.min(100, macdScore));
  }

  // 3. Bollinger Bands Score
  let bbScore = 0;
  if (!isNaN(bbUpper) && !isNaN(bbLower) && bbMiddle !== null) {
    const bbWidth = bbUpper - bbLower;
    const position = bbWidth > 0 ? (currentPrice - bbLower) / bbWidth : 0.5;
    // Below lower band → oversold → bullish
    if (position < 0.1) bbScore = 70;
    else if (position < 0.3) bbScore = 35;
    else if (position > 0.9) bbScore = -70;
    else if (position > 0.7) bbScore = -35;
    else bbScore = (0.5 - position) * -40;
    bbScore = Math.max(-100, Math.min(100, bbScore));
  }

  // 4. EMA Crossover Score
  let emaScore = 0;
  if (!isNaN(ema9Val) && !isNaN(ema21Val)) {
    const prevEma9 = ema9Values[lastIdx - 1];
    const prevEma21 = ema21Values[lastIdx - 1];
    if (ema9Val > ema21Val) {
      emaScore = 40;
      if (!isNaN(prevEma9) && !isNaN(prevEma21) && prevEma9 <= prevEma21) {
        emaScore = 70; // Fresh golden cross
      }
    } else {
      emaScore = -40;
      if (!isNaN(prevEma9) && !isNaN(prevEma21) && prevEma9 >= prevEma21) {
        emaScore = -70; // Fresh death cross
      }
    }
  }

  // 5. Volume Score
  let volScore = 0;
  if (volAvg !== null && volAvg > 0) {
    const volRatio = currentVol / volAvg;
    const priceChange = closes[lastIdx] - closes[lastIdx - 1];
    if (volRatio > 1.5 && priceChange > 0) volScore = 50;  // High vol + up = bullish
    else if (volRatio > 1.5 && priceChange < 0) volScore = -50; // High vol + down = bearish
    else if (volRatio < 0.5) volScore = 0; // Low vol = indecisive
    else volScore = priceChange > 0 ? 15 : -15;
  }

  // 6. Momentum Score (rate of change)
  let momentumScore = 0;
  const lookback = Math.min(10, closes.length);
  if (lookback >= 5) {
    const recentClose = closes[lastIdx];
    const pastClose = closes[lastIdx - lookback + 1];
    const pctChange = ((recentClose - pastClose) / pastClose) * 100;
    // Momentum: scale to -100..100 based on % change
    momentumScore = Math.max(-80, Math.min(80, pctChange * 20));
  }

  // ── Weighted Composite Score ──────────────────────────────
  const weights = {
    rsi: 0.20,
    macd: 0.25,
    bollinger: 0.15,
    ema: 0.15,
    volume: 0.10,
    momentum: 0.15,
  };

  const compositeScore =
    rsiScore * weights.rsi +
    macdScore * weights.macd +
    bbScore * weights.bollinger +
    emaScore * weights.ema +
    volScore * weights.volume +
    momentumScore * weights.momentum;

  // ── Determine Signal Type ─────────────────────────────────
  let type: SignalType;
  if (compositeScore >= 50) type = 'STRONG_BUY';
  else if (compositeScore >= 20) type = 'BUY';
  else if (compositeScore <= -50) type = 'STRONG_SELL';
  else if (compositeScore <= -20) type = 'SELL';
  else type = 'HOLD';

  // ── Confidence (0-1) ──────────────────────────────────────
  const confidence = Math.min(1, Math.abs(compositeScore) / 70);

  // ── Stop Loss & Take Profit ───────────────────────────────
  const atrMultiplier = !isNaN(atrVal) ? atrVal : currentPrice * 0.01;
  let stopLoss: number;
  let takeProfit: number;

  if (compositeScore > 0) {
    // Long position
    stopLoss = currentPrice - atrMultiplier * 1.5;
    takeProfit = currentPrice + atrMultiplier * 2.5;
  } else {
    // Short position
    stopLoss = currentPrice + atrMultiplier * 1.5;
    takeProfit = currentPrice - atrMultiplier * 2.5;
  }

  // Round to appropriate precision
  const precision = currentPrice > 1000 ? 2 : currentPrice > 1 ? 4 : 6;
  stopLoss = parseFloat(stopLoss.toFixed(precision));
  takeProfit = parseFloat(takeProfit.toFixed(precision));

  // ── Build reasoning ───────────────────────────────────────
  const reasoning: string[] = [];
  if (!isNaN(rsiVal)) {
    if (rsiVal < 30) reasoning.push(`RSI at ${rsiVal.toFixed(1)} — oversold, bullish reversal likely`);
    else if (rsiVal > 70) reasoning.push(`RSI at ${rsiVal.toFixed(1)} — overbought, bearish pressure`);
    else reasoning.push(`RSI at ${rsiVal.toFixed(1)} — neutral zone`);
  }
  if (!isNaN(macdVal) && !isNaN(macdSig)) {
    if (macdVal > macdSig) reasoning.push('MACD bullish crossover confirmed');
    else reasoning.push('MACD bearish crossover detected');
  }
  if (bbMiddle !== null) {
    if (currentPrice < bbLower) reasoning.push('Price below lower Bollinger Band — potential bounce');
    else if (currentPrice > bbUpper) reasoning.push('Price above upper Bollinger Band — potential pullback');
  }
  if (!isNaN(ema9Val) && !isNaN(ema21Val)) {
    if (ema9Val > ema21Val) reasoning.push('EMA 9 above EMA 21 — bullish trend');
    else reasoning.push('EMA 9 below EMA 21 — bearish trend');
  }

  return {
    signal: {
      type,
      score: parseFloat(compositeScore.toFixed(1)),
      confidence: parseFloat(confidence.toFixed(2)),
      stopLoss,
      takeProfit,
      entryPrice: parseFloat(currentPrice.toFixed(precision)),
      reasoning,
    },
    indicators: {
      rsi: parseFloat(rsiScore.toFixed(1)),
      macd: parseFloat(macdScore.toFixed(1)),
      bollinger: parseFloat(bbScore.toFixed(1)),
      ema: parseFloat(emaScore.toFixed(1)),
      volume: parseFloat(volScore.toFixed(1)),
      momentum: parseFloat(momentumScore.toFixed(1)),
    },
    currentPrice: parseFloat(currentPrice.toFixed(precision)),
    rsiValue: !isNaN(rsiVal) ? parseFloat(rsiVal.toFixed(2)) : null,
    macdValue: !isNaN(macdVal) ? parseFloat(macdVal.toFixed(precision)) : null,
    macdSignal: !isNaN(macdSig) ? parseFloat(macdSig.toFixed(precision)) : null,
    macdHistogram: !isNaN(macdHist) ? parseFloat(macdHist.toFixed(precision)) : null,
    bollingerUpper: !isNaN(bbUpper) ? parseFloat(bbUpper.toFixed(precision)) : null,
    bollingerMiddle: bbMiddle !== null ? parseFloat(bbMiddle.toFixed(precision)) : null,
    bollingerLower: !isNaN(bbLower) ? parseFloat(bbLower.toFixed(precision)) : null,
    ema9: !isNaN(ema9Val) ? parseFloat(ema9Val.toFixed(precision)) : null,
    ema21: !isNaN(ema21Val) ? parseFloat(ema21Val.toFixed(precision)) : null,
    atrValue: !isNaN(atrVal) ? parseFloat(atrVal.toFixed(precision)) : null,
    priceChange24h: closes.length > 1
      ? parseFloat(((currentPrice - closes[0]) / closes[0] * 100).toFixed(2))
      : null,
    volumeAvg: volAvg !== null ? parseFloat(volAvg.toFixed(0)) : null,
    currentVolume: parseFloat(currentVol.toFixed(0)),
  };
}