'use client';

import { FullAnalysis, IndicatorScores } from '@/lib/signals';
import { Card, CardContent } from '@/components/ui/card';

interface IndicatorPanelProps {
  analysis: FullAnalysis;
  fundingRate?: number | null;
}

function ScoreBar({ label, score, value }: { label: string; score: number; value?: string | number | null }) {
  const isPositive = score >= 0;
  const barColor = isPositive ? 'bg-emerald-500' : 'bg-red-500';

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-zinc-500 font-medium">{label}</span>
        <div className="flex items-center gap-2">
          {value !== null && value !== undefined && (
            <span className="text-xs font-mono text-zinc-400">{value}</span>
          )}
          <span className={`text-xs font-bold ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
            {isPositive ? '+' : ''}{score}
          </span>
        </div>
      </div>
      <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{
            left: score >= 0 ? '50%' : `${50 + score}%`,
            width: `${Math.abs(score) / 2}%`,
            position: 'relative',
          }}
        />
      </div>
    </div>
  );
}

export default function IndicatorPanel({ analysis, fundingRate }: IndicatorPanelProps) {
  const { indicators } = analysis;

  return (
    <Card className="bg-zinc-900/80 border border-zinc-800/50">
      <CardContent className="p-5">
        <h3 className="text-sm font-semibold text-zinc-300 mb-4 uppercase tracking-wider">
          Indicator Breakdown
        </h3>
        <div className="space-y-4">
          <ScoreBar
            label="RSI (14)"
            score={indicators.rsi}
            value={analysis.rsiValue !== null ? analysis.rsiValue.toFixed(1) : null}
          />
          <ScoreBar
            label="MACD (12,26,9)"
            score={indicators.macd}
            value={analysis.macdHistogram !== null ? analysis.macdHistogram.toFixed(4) : null}
          />
          <ScoreBar
            label="Bollinger Bands"
            score={indicators.bollinger}
          />
          <ScoreBar
            label="EMA Cross (9/21)"
            score={indicators.ema}
          />
          <ScoreBar
            label="Volume"
            score={indicators.volume}
            value={analysis.currentVolume?.toLocaleString()}
          />
          <ScoreBar
            label="Momentum"
            score={indicators.momentum}
          />
        </div>

        {/* Extra stats */}
        <div className="mt-5 pt-4 border-t border-zinc-800/50 grid grid-cols-2 gap-3">
          <div>
            <p className="text-[10px] text-zinc-600 uppercase tracking-wider">EMA 9</p>
            <p className="text-sm font-mono text-amber-400">
              {analysis.ema9 !== null ? `$${analysis.ema9.toLocaleString()}` : '—'}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-zinc-600 uppercase tracking-wider">EMA 21</p>
            <p className="text-sm font-mono text-cyan-400">
              {analysis.ema21 !== null ? `$${analysis.ema21.toLocaleString()}` : '—'}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-zinc-600 uppercase tracking-wider">ATR (14)</p>
            <p className="text-sm font-mono text-zinc-400">
              {analysis.atrValue !== null ? `$${analysis.atrValue.toLocaleString()}` : '—'}
            </p>
          </div>
          <div>
            <p className="text-[10px] text-zinc-600 uppercase tracking-wider">Avg Volume</p>
            <p className="text-sm font-mono text-zinc-400">
              {analysis.volumeAvg !== null ? analysis.volumeAvg.toLocaleString() : '—'}
            </p>
          </div>
          {fundingRate !== undefined && fundingRate !== null && (
            <div className="col-span-2 pt-2 border-t border-zinc-800/30">
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-zinc-600 uppercase tracking-wider">Funding Rate</p>
                <span className={`text-sm font-mono font-medium ${fundingRate >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {(fundingRate * 100).toFixed(4)}%
                  <span className="text-[10px] text-zinc-600 ml-1.5">
                    {fundingRate >= 0 ? 'longs pay' : 'shorts pay'}
                  </span>
                </span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}