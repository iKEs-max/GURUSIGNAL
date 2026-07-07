// Technical Indicators Library
// All calculations operate on OHLCV candle data

export interface Candle {
  time: number;      // Unix timestamp in seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// ── Exponential Moving Average ──────────────────────────────
export function ema(data: number[], period: number): number[] {
  const result: number[] = [];
  const k = 2 / (period + 1);

  // Seed with SMA
  let sum = 0;
  for (let i = 0; i < period && i < data.length; i++) {
    sum += data[i];
  }
  result[period - 1] = sum / period;

  for (let i = period; i < data.length; i++) {
    result[i] = data[i] * k + result[i - 1] * (1 - k);
  }

  return result;
}

// ── Simple Moving Average ───────────────────────────────────
export function sma(data: number[], period: number): number[] {
  const result: number[] = [];
  for (let i = period - 1; i < data.length; i++) {
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      sum += data[j];
    }
    result[i] = sum / period;
  }
  return result;
}

// ── RSI (Relative Strength Index) ───────────────────────────
export function rsi(closes: number[], period: number = 14): number[] {
  const result: number[] = new Array(closes.length).fill(NaN);
  if (closes.length < period + 1) return result;

  let avgGain = 0;
  let avgLoss = 0;

  for (let i = 1; i <= period; i++) {
    const change = closes[i] - closes[i - 1];
    if (change > 0) avgGain += change;
    else avgLoss += Math.abs(change);
  }

  avgGain /= period;
  avgLoss /= period;
  result[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

  for (let i = period + 1; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    result[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }

  return result;
}

// ── MACD (Moving Average Convergence Divergence) ────────────
export interface MACDResult {
  macd: number[];
  signal: number[];
  histogram: number[];
}

export function macd(
  closes: number[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): MACDResult {
  const fastEma = ema(closes, fastPeriod);
  const slowEma = ema(closes, slowPeriod);

  const macdLine: number[] = new Array(closes.length).fill(NaN);
  for (let i = 0; i < closes.length; i++) {
    if (!isNaN(fastEma[i]) && !isNaN(slowEma[i])) {
      macdLine[i] = fastEma[i] - slowEma[i];
    }
  }

  // Signal line is EMA of MACD line
  const validMacd = macdLine.filter((v) => !isNaN(v));
  const signalEma = ema(validMacd, signalPeriod);

  const signalLine: number[] = new Array(closes.length).fill(NaN);
  const histogram: number[] = new Array(closes.length).fill(NaN);

  let validIdx = 0;
  for (let i = 0; i < closes.length; i++) {
    if (!isNaN(macdLine[i])) {
      if (validIdx < signalEma.length) {
        signalLine[i] = signalEma[validIdx];
        histogram[i] = macdLine[i] - signalEma[validIdx];
      }
      validIdx++;
    }
  }

  return { macd: macdLine, signal: signalLine, histogram };
}

// ── Bollinger Bands ─────────────────────────────────────────
export interface BollingerResult {
  upper: number[];
  middle: number[];
  lower: number[];
}

export function bollingerBands(
  closes: number[],
  period: number = 20,
  stdMultiplier: number = 2
): BollingerResult {
  const middle = sma(closes, period);
  const upper: number[] = new Array(closes.length).fill(NaN);
  const lower: number[] = new Array(closes.length).fill(NaN);

  for (let i = period - 1; i < closes.length; i++) {
    let sumSq = 0;
    for (let j = i - period + 1; j <= i; j++) {
      sumSq += Math.pow(closes[j] - middle[i - (period - 1)], 2);
    }
    const std = Math.sqrt(sumSq / period);
    const midIdx = i - (period - 1);
    upper[i] = middle[midIdx] + stdMultiplier * std;
    lower[i] = middle[midIdx] - stdMultiplier * std;
  }

  return { upper, middle, lower };
}

// ── ATR (Average True Range) ────────────────────────────────
export function atr(candles: Candle[], period: number = 14): number[] {
  const trueRanges: number[] = [candles[0].high - candles[0].low];

  for (let i = 1; i < candles.length; i++) {
    const tr = Math.max(
      candles[i].high - candles[i].low,
      Math.abs(candles[i].high - candles[i - 1].close),
      Math.abs(candles[i].low - candles[i - 1].close)
    );
    trueRanges.push(tr);
  }

  const result: number[] = new Array(candles.length).fill(NaN);

  // Seed with SMA
  let sum = 0;
  for (let i = 0; i < period && i < trueRanges.length; i++) {
    sum += trueRanges[i];
  }
  result[period - 1] = sum / period;

  // Smooth with EMA-like method
  for (let i = period; i < trueRanges.length; i++) {
    result[i] = (result[i - 1] * (period - 1) + trueRanges[i]) / period;
  }

  return result;
}

// ── Volume Profile ──────────────────────────────────────────
export function volumeSMA(volumes: number[], period: number = 20): number[] {
  return sma(volumes, period);
}