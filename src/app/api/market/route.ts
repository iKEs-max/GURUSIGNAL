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

// POST endpoint — receives raw kline data from client, returns signals
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { klines, symbol, interval, fundingRate } = body as {
      klines: BinanceKline[];
      symbol: string;
      interval: string;
      fundingRate?: number | null;
    };

    if (!VALID_INTERVALS.includes(interval)) {
      return NextResponse.json(
        { error: `Invalid interval. Use: ${VALID_INTERVALS.join(', ')}` },
        { status: 400 }
      );
    }

    if (!klines || !Array.isArray(klines) || klines.length === 0) {
      return NextResponse.json(
        { error: 'No kline data provided.' },
        { status: 400 }
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
      fundingRate: fundingRate ?? null,
      fetchedAt: new Date().toISOString(),
      candleCount: candles.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Signal generation error:', message);
    return NextResponse.json(
      { error: `Signal generation failed: ${message}` },
      { status: 500 }
    );
  }
}