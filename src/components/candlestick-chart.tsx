'use client';

import { useEffect, useRef, useCallback } from 'react';
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  ColorType,
  Time,
} from 'lightweight-charts';
import type { IChartApi, ISeriesApi, CandlestickData, HistogramData, LineData } from 'lightweight-charts';

interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface ChartProps {
  candles: CandleData[];
}

export default function CandlestickChart({ candles }: ChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  const initChart = useCallback(() => {
    if (!chartContainerRef.current) return undefined;

    // Clean up existing chart
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const container = chartContainerRef.current;

    const chart = createChart(container, {
      layout: {
        background: { type: ColorType.Solid, color: '#0a0a0a' },
        textColor: '#a1a1aa',
        fontSize: 12,
      },
      grid: {
        vertLines: { color: '#1a1a2e' },
        horzLines: { color: '#1a1a2e' },
      },
      crosshair: {
        mode: 0,
        vertLine: {
          color: '#3b82f6',
          width: 1,
          style: 2,
          labelBackgroundColor: '#1e293b',
        },
        horzLine: {
          color: '#3b82f6',
          width: 1,
          style: 2,
          labelBackgroundColor: '#1e293b',
        },
      },
      rightPriceScale: {
        borderColor: '#1a1a2e',
        scaleMargins: { top: 0.1, bottom: 0.25 },
      },
      timeScale: {
        borderColor: '#1a1a2e',
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 5,
        barSpacing: 8,
      },
      width: container.clientWidth,
      height: 500,
    });

    chartRef.current = chart;

    // Candlestick series (v5 API)
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderUpColor: '#22c55e',
      borderDownColor: '#ef4444',
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    });

    // Volume series (v5 API)
    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    });
    chart.priceScale('volume').applyOptions({
      scaleMargins: { top: 0.85, bottom: 0 },
    });

    // Populate candle data
    const candleData: CandlestickData<Time>[] = candles.map((c) => ({
      time: c.time as Time,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));
    candleSeries.setData(candleData);

    // Populate volume data
    const volData: HistogramData<Time>[] = candles.map((c) => ({
      time: c.time as Time,
      value: c.volume,
      color: c.close >= c.open ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)',
    }));
    volumeSeries.setData(volData);

    // EMA 9 line
    const ema9Data = computeEMA(candles.map(c => c.close), 9);
    const validEma9: LineData<Time>[] = [];
    candles.forEach((c, i) => {
      if (ema9Data[i] != null) {
        validEma9.push({ time: c.time as Time, value: ema9Data[i]! });
      }
    });
    if (validEma9.length > 0) {
      const ema9Line = chart.addSeries(LineSeries, {
        color: '#f59e0b',
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
      });
      ema9Line.setData(validEma9);
    }

    // EMA 21 line
    const ema21Data = computeEMA(candles.map(c => c.close), 21);
    const validEma21: LineData<Time>[] = [];
    candles.forEach((c, i) => {
      if (ema21Data[i] != null) {
        validEma21.push({ time: c.time as Time, value: ema21Data[i]! });
      }
    });
    if (validEma21.length > 0) {
      const ema21Line = chart.addSeries(LineSeries, {
        color: '#06b6d4',
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
      });
      ema21Line.setData(validEma21);
    }

    // Bollinger Bands
    const bb = computeBollinger(candles.map(c => c.close), 20, 2);
    const validBBUpper: LineData<Time>[] = [];
    const validBBLower: LineData<Time>[] = [];
    const validBBMid: LineData<Time>[] = [];
    candles.forEach((c, i) => {
      if (bb.upper[i] != null) {
        validBBUpper.push({ time: c.time as Time, value: bb.upper[i]! });
        validBBLower.push({ time: c.time as Time, value: bb.lower[i]! });
        validBBMid.push({ time: c.time as Time, value: bb.middle[i]! });
      }
    });
    if (validBBUpper.length > 0) {
      const bbUpperLine = chart.addSeries(LineSeries, {
        color: 'rgba(168,85,247,0.4)',
        lineWidth: 1,
        lineStyle: 2,
        priceLineVisible: false,
        lastValueVisible: false,
      });
      bbUpperLine.setData(validBBUpper);

      const bbLowerLine = chart.addSeries(LineSeries, {
        color: 'rgba(168,85,247,0.4)',
        lineWidth: 1,
        lineStyle: 2,
        priceLineVisible: false,
        lastValueVisible: false,
      });
      bbLowerLine.setData(validBBLower);

      const bbMidLine = chart.addSeries(LineSeries, {
        color: 'rgba(168,85,247,0.6)',
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
      });
      bbMidLine.setData(validBBMid);
    }

    // Fit content
    chart.timeScale().fitContent();

    // Resize handler
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, [candles]);

  useEffect(() => {
    const cleanup = initChart();
    return () => {
      cleanup?.();
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [initChart]);

  return (
    <div
      ref={chartContainerRef}
      className="w-full rounded-xl overflow-hidden border border-zinc-800/50"
      style={{ minHeight: '500px' }}
    />
  );
}

// ── Local indicator computations for chart overlays ──────────

function computeEMA(data: number[], period: number): (number | null)[] {
  const result: (number | null)[] = new Array(data.length).fill(null);
  if (data.length < period) return result;
  const k = 2 / (period + 1);
  let sum = 0;
  for (let i = 0; i < period; i++) sum += data[i];
  result[period - 1] = sum / period;
  for (let i = period; i < data.length; i++) {
    result[i] = data[i] * k + result[i - 1]! * (1 - k);
  }
  return result;
}

function computeBollinger(closes: number[], period: number, mult: number) {
  const middle: (number | null)[] = new Array(closes.length).fill(null);
  const upper: (number | null)[] = new Array(closes.length).fill(null);
  const lower: (number | null)[] = new Array(closes.length).fill(null);
  for (let i = period - 1; i < closes.length; i++) {
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += closes[j];
    const avg = sum / period;
    let sqSum = 0;
    for (let j = i - period + 1; j <= i; j++) sqSum += (closes[j] - avg) ** 2;
    const std = Math.sqrt(sqSum / period);
    const idx = i - (period - 1);
    middle[i] = avg;
    upper[i] = avg + mult * std;
    lower[i] = avg - mult * std;
  }
  return { upper, middle, lower };
}