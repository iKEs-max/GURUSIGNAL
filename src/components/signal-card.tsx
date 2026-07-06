'use client';

import { SignalType, Signal } from '@/lib/signals';
import { TrendingUp, TrendingDown, Minus, AlertTriangle, Target, Shield } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const signalConfig: Record<SignalType, { label: string; color: string; bg: string; border: string; icon: React.ReactNode }> = {
  STRONG_BUY: {
    label: 'Strong Buy',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    icon: <TrendingUp className="w-5 h-5 text-emerald-400" />,
  },
  BUY: {
    label: 'Buy',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    icon: <TrendingUp className="w-5 h-5 text-emerald-400" />,
  },
  HOLD: {
    label: 'Hold',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    icon: <Minus className="w-5 h-5 text-amber-400" />,
  },
  SELL: {
    label: 'Sell',
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
    icon: <TrendingDown className="w-5 h-5 text-red-400" />,
  },
  STRONG_SELL: {
    label: 'Strong Sell',
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    icon: <TrendingDown className="w-5 h-5 text-red-400" />,
  },
};

interface SignalCardProps {
  signal: Signal;
}

export default function SignalCard({ signal }: SignalCardProps) {
  const config = signalConfig[signal.type];

  return (
    <div className="space-y-4">
      {/* Main Signal */}
      <Card className={`${config.bg} ${config.border} border`}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              {config.icon}
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wider font-medium">Signal</p>
                <p className={`text-2xl font-bold ${config.color}`}>{config.label}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-zinc-500 uppercase tracking-wider font-medium">Confidence</p>
              <p className="text-2xl font-bold text-zinc-100">
                {(signal.confidence * 100).toFixed(0)}%
              </p>
            </div>
          </div>

          {/* Score bar */}
          <div className="relative h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className={`absolute top-0 h-full rounded-full transition-all duration-500 ${
                signal.score >= 0 ? 'bg-emerald-500' : 'bg-red-500'
              }`}
              style={{
                left: signal.score >= 0 ? '50%' : `${50 + signal.score}%`,
                width: `${Math.abs(signal.score) / 2}%`,
              }}
            />
            <div className="absolute top-0 left-1/2 w-px h-full bg-zinc-600" />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[10px] text-zinc-600">Strong Sell</span>
            <span className="text-[10px] text-zinc-600">Strong Buy</span>
          </div>
        </CardContent>
      </Card>

      {/* Price Levels */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Entry */}
        <Card className="bg-zinc-900/80 border border-zinc-800/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-zinc-400" />
              <p className="text-xs text-zinc-500 uppercase tracking-wider font-medium">Entry Price</p>
            </div>
            <p className="text-lg font-mono font-bold text-zinc-100">
              ${signal.entryPrice.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        {/* Stop Loss */}
        <Card className="bg-zinc-900/80 border border-red-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-red-400" />
              <p className="text-xs text-red-400 uppercase tracking-wider font-medium">Stop Loss</p>
            </div>
            <p className="text-lg font-mono font-bold text-red-400">
              ${signal.stopLoss.toLocaleString()}
            </p>
            <p className="text-xs text-zinc-600 mt-1">
              {((Math.abs(signal.stopLoss - signal.entryPrice) / signal.entryPrice) * 100).toFixed(2)}% risk
            </p>
          </CardContent>
        </Card>

        {/* Take Profit */}
        <Card className="bg-zinc-900/80 border border-emerald-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-emerald-400" />
              <p className="text-xs text-emerald-400 uppercase tracking-wider font-medium">Take Profit</p>
            </div>
            <p className="text-lg font-mono font-bold text-emerald-400">
              ${signal.takeProfit.toLocaleString()}
            </p>
            <p className="text-xs text-zinc-600 mt-1">
              {((Math.abs(signal.takeProfit - signal.entryPrice) / signal.entryPrice) * 100).toFixed(2)}% target
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Reasoning */}
      {signal.reasoning.length > 0 && (
        <Card className="bg-zinc-900/80 border border-zinc-800/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <p className="text-xs text-zinc-500 uppercase tracking-wider font-medium">Analysis Reasoning</p>
            </div>
            <ul className="space-y-2">
              {signal.reasoning.map((r, i) => (
                <li key={i} className="text-sm text-zinc-400 flex items-start gap-2">
                  <span className="text-zinc-600 mt-0.5">•</span>
                  {r}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}