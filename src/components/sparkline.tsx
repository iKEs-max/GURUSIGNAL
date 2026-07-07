'use client';

import { useEffect, useRef } from 'react';

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
}

export default function Sparkline({ data, width = 200, height = 36 }: SparklineProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length < 2) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const padding = 2;

    const xStep = (width - padding * 2) / (data.length - 1);

    // Determine color based on trend
    const lastScore = data[data.length - 1];
    const firstScore = data[0];
    const isUp = lastScore >= firstScore;
    const lineColor = isUp ? '#34d399' : '#f87171'; // emerald-400 / red-400
    const fillColor = isUp ? 'rgba(52, 211, 153, 0.08)' : 'rgba(248, 113, 113, 0.08)';

    // Draw fill
    ctx.beginPath();
    data.forEach((val, i) => {
      const x = padding + i * xStep;
      const y = padding + (1 - (val - min) / range) * (height - padding * 2);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.lineTo(padding + (data.length - 1) * xStep, height);
    ctx.lineTo(padding, height);
    ctx.closePath();
    ctx.fillStyle = fillColor;
    ctx.fill();

    // Draw line
    ctx.beginPath();
    data.forEach((val, i) => {
      const x = padding + i * xStep;
      const y = padding + (1 - (val - min) / range) * (height - padding * 2);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';
    ctx.stroke();

    // Draw zero line if range crosses 0
    if (min < 0 && max > 0) {
      const zeroY = padding + (1 - (0 - min) / range) * (height - padding * 2);
      ctx.beginPath();
      ctx.moveTo(padding, zeroY);
      ctx.lineTo(width - padding, zeroY);
      ctx.strokeStyle = 'rgba(113, 113, 122, 0.3)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw end dot
    const lastX = padding + (data.length - 1) * xStep;
    const lastY = padding + (1 - (data[data.length - 1] - min) / range) * (height - padding * 2);
    ctx.beginPath();
    ctx.arc(lastX, lastY, 3, 0, Math.PI * 2);
    ctx.fillStyle = lineColor;
    ctx.fill();
  }, [data, width, height]);

  if (data.length < 2) {
    return <div className="text-[10px] text-zinc-700 italic">Waiting for data...</div>;
  }

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height }}
      className="block"
    />
  );
}