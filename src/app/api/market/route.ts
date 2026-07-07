import { NextRequest, NextResponse } from 'next/server';
import { Candle } from '@/lib/indicators';
import { generateSignals, FullAnalysis } from '@/lib/signals';

interface BinanceKline {
  0: number;  // Open time
  1: string;  // Open
  2: string;  // High
  3: string;  // Low
  4: string;  // Close
  5: string;  // Volume
  6: number;  // Close time
  7: string;  // Quote asset volume
  8: number;  // Number of trades
  9: string;  // Taker buy base asset volume
  10: string; // Taker buy quote asset volume
  11: string; // Ignore
}

const VALID_INTERVALS = ['1m', '5m', '15m'];

const FETCH_HEADERS: Record<string, string> = {
  'Accept': 'application/json',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
};

// Multiple Binance endpoints for fallback
const BINANCE_ENDPOINTS = [
  'https://fapi.binance.com',
  'https://fapi1.binance.com',
  'https://fapi2.binance.com',
  'https://fapi3.binance.com',
];

async function fetchJSON(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      cache: 'no-store',
      signal: controller.signal,
      headers: FETCH_HEADERS,
    });
  } finally {
    clearTimeout(timeout);
  }
}

// Try multiple Binance endpoints with retries
async function fetchWithFallback(path: string, timeoutMs: number): Promise<Response> {
  const errors: string[] = [];

  for (const base of BINANCE_ENDPOINTS) {
    const url = `${base}${path}`;
    for (let attempt = 0; attempt <= 1; attempt++) {
      try {
        const res = await fetchJSON(url, timeoutMs);
        if (res.ok || res.status === 400 || res.status === 429) {
          return res; // Got a real Binance response (even if it's an error)
        }
        // Non-200 from Binance itself — try next endpoint
        errors.push(`${base}: status ${res.status}`);
        break;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`${base}: ${msg}`);
        if (attempt < 1) {
          await new Promise((r) => setTimeout(r, 300));
        }
      }
    }
  }

  throw new Error(`All endpoints failed: ${errors.join('; ')}`);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = (searchParams.get('symbol') || 'BTCUSDT').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const interval = searchParams.get('interval') || '5m';
  const limit = parseInt(searchParams.get('limit') || '200', 10);

  if (!VALID_INTERVALS.includes(interval)) {
    return NextResponse.json(
      { error: `Invalid interval. Use: ${VALID_INTERVALS.join(', ')}` },
      { status: 400 }
    );
  }

  try {
    // Fetch kline data — tries multiple Binance endpoints automatically
    const klinePath = `/fapi/v1/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
    const response = await fetchWithFallback(klinePath, 12000);

    if (!response.ok) {
      const errorBody = await response.text();
      return NextResponse.json(
        { error: `Binance error: ${errorBody}` },
        { status: 400 }
      );
    }

    const klines: BinanceKline[] = await response.json();

    if (!klines || klines.length === 0) {
      return NextResponse.json(
        { error: `No data found for "${symbol}". Try "BTCUSDT" or "ETHUSDT".` },
        { status: 404 }
      );
    }

    // Parse candles
    const candles: Candle[] = klines.map((k) => ({
      time: Math.floor(k[0] / 1000),
      open: parseFloat(k[1]),
      high: parseFloat(k[2]),
      low: parseFloat(k[3]),
      close: parseFloat(k[4]),
      volume: parseFloat(k[5]),
    }));

    // Generate signals
    const analysis: FullAnalysis | null = generateSignals(candles);

    if (!analysis) {
      return NextResponse.json(
        { error: 'Not enough data to generate signals. Need at least 50 candles.' },
        { status: 422 }
      );
    }

    // Fetch funding rate (optional, non-blocking)
    let fundingRate: number | null = null;
    try {
      const fundingPath = `/fapi/v1/fundingRate?symbol=${symbol}&limit=1`;
      const fundingRes = await fetchWithFallback(fundingPath, 6000);
      if (fundingRes.ok) {
        const fundingData = await fundingRes.json();
        if (Array.isArray(fundingData) && fundingData.length > 0) {
          fundingRate = parseFloat(fundingData[0].fundingRate);
        }
      }
    } catch {
      // Funding rate is optional — don't fail the whole request
    }

    // Return chart data + analysis
    const chartCandles = candles.map((c) => ({
      time: c.time,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      volume: c.volume,
    }));

    return NextResponse.json({
      symbol,
      interval,
      candles: chartCandles,
      analysis,
      fundingRate,
      fetchedAt: new Date().toISOString(),
      candleCount: candles.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Market API error:', message);
    return NextResponse.json(
      { error: `Failed to fetch market data: ${message}` },
      { status: 500 }
    );
  }
}