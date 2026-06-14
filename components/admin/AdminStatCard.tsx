'use client';

import { useEffect, useState, useRef } from 'react';

interface AdminStatCardProps {
  icon: string;
  value: number;
  label: string;
  trend?: string;
  trendUp?: boolean;
  accent: 'blue' | 'teal' | 'gold' | 'green';
  suffix?: string;
  subtext?: string;
}

export function AdminStatCard({ icon, value, label, trend, trendUp, accent, suffix, subtext }: AdminStatCardProps) {
  const [display, setDisplay] = useState(0);
  const counted = useRef(false);

  useEffect(() => {
    if (counted.current) { setDisplay(value); return; }
    const duration = 1500;
    const steps = 30;
    const increment = value / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setDisplay(value);
        clearInterval(timer);
        counted.current = true;
      } else {
        setDisplay(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [value]);

  const borderColor = {
    blue: 'border-[#0EA5E9]/30',
    teal: 'border-cyan-400/30',
    gold: 'border-yellow-400/30',
    green: 'border-green-400/30'
  }[accent];

  const shadowColor = {
    blue: 'rgba(14,165,233,0.15)',
    teal: 'rgba(0,188,212,0.15)',
    gold: 'rgba(255,179,0,0.12)',
    green: 'rgba(0,230,118,0.12)'
  }[accent];

  return (
    <div
      className={`rounded-2xl border ${borderColor} bg-[#1A2235] p-5 transition-all duration-300 hover:scale-[1.02]`}
      style={{ boxShadow: `0 0 20px ${shadowColor}` }}
    >
      <div className="flex items-start justify-between">
        <span className="text-2xl">{icon}</span>
        {subtext && (
          <span className="rounded-full bg-[#111827] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#8892A4]">
            {subtext}
          </span>
        )}
      </div>
      <p className="mt-3 font-jetbrains text-4xl font-semibold tracking-tight text-[#F0F4FF]">
        {display}{suffix || ''}
      </p>
      <p className="mt-1 text-xs font-medium uppercase tracking-[0.15em] text-[#8892A4]">{label}</p>
      {trend && (
        <p className={`mt-2 flex items-center gap-1 text-xs font-medium ${trendUp ? 'text-green-400' : 'text-red-500'}`}>
          <span>{trendUp ? '▲' : '▼'}</span> {trend}
        </p>
      )}
    </div>
  );
}
