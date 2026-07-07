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

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = (searchParams.get('symbol') || 'BTCUSDT').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const interval = searchParams.get('interval') || '5m';
  const limit = parseInt(searchParams.get('limit') || '200', 10);

  try {
    // Fetch kline data from Binance FUTURES API (fapi) for perpetual futures
    const url = `https://fapi.binance.com/fapi/v1/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
    const response = await fetch(url, {
      cache: 'no-store',
      signal: AbortSignal.timeout(15000),
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      if (response.status === 400 || response.status === 429) {
        return NextResponse.json(
          { error: `Invalid symbol or rate limited: ${errorBody}` },
          { status: 400 }
        );
      }
      throw new Error(`Binance Futures API error: ${response.status} ${errorBody}`);
    }

    const klines: BinanceKline[] = await response.json();

    if (!klines || klines.length === 0) {
      return NextResponse.json(
        { error: `No data found for symbol "${symbol}". Try "BTCUSDT" or "ETHUSDT".` },
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
      fetchedAt: new Date().toISOString(),
      candleCount: candles.length,
    });
  } catch (error) {
    console.error('Market API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch market data. Please try again.' },
      { status: 500 }
    );
  }
}