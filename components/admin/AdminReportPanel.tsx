'use client';

import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

interface Report {
  id: string;
  type: string;
  busId?: string;
  routeNumber?: string;
  message: string;
  contact?: string;
  reportedAt: string;
}

const REPORT_EMOJIS: Record<string, string> = {
  delay: '⏰', overcrowding: '😤', misbehavior: '⚠️',
  breakdown: '🔧', 'route-deviation': '🛣️', other: '📢',
};

export function AdminReportPanel() {
  const [reports, setReports] = useState<Report[]>([]);

  useEffect(() => {
    fetch('/api/report')
      .then(r => r.json())
      .then(setReports)
      .catch(() => {});
    const socket = io((window as any).NEXT_PUBLIC_SOCKET_URL || window.location.origin, { transports: ['websocket'] });
    socket.on('new-report', (report: Report) => {
      setReports(prev => [report, ...prev]);
    });
    return () => { socket.disconnect(); };
  }, []);

  return (
    <div className="rounded-2xl border border-white/5 bg-[#1A2235] p-5">
      <div className="mb-4 flex items-center gap-2">
        <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
        <h3 className="font-orbitron text-xs font-semibold uppercase tracking-[0.2em] text-[#F0F4FF]">
          Passenger Reports
        </h3>
        <span className="ml-auto font-jetbrains text-[10px] text-[#8892A4]">
          {reports.length} total
        </span>
      </div>
      <div className="space-y-2 max-h-80 overflow-y-auto">
        {reports.length === 0 && (
          <p className="text-center text-xs text-[#8892A4] py-8">No reports yet</p>
        )}
        {reports.map((report) => (
          <div key={report.id} className="rounded-xl border border-white/5 bg-[#111827] p-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">{REPORT_EMOJIS[report.type] || '📢'}</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#8892A4]">
                {report.type}
              </span>
              <span className="ml-auto font-jetbrains text-[10px] text-[#8892A4]">
                {new Date(report.reportedAt).toLocaleTimeString('en-IN', { hour12: false })}
              </span>
            </div>
            <p className="mt-1 text-sm text-[#F0F4FF]">{report.message}</p>
            {report.routeNumber && (
              <p className="mt-0.5 text-[10px] text-[#0EA5E9]">Route: {report.routeNumber}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
