'use client';

import { useState } from 'react';
import { useLanguage } from '@/lib/LanguageContext';

interface ReportPayload {
  type: 'delay' | 'overcrowding' | 'misbehavior' | 'breakdown' | 'route-deviation' | 'other';
  busId?: string;
  routeNumber?: string;
  message: string;
  contact?: string;
}

const REPORT_TYPES: { value: ReportPayload['type']; labelKey: string; emoji: string }[] = [
  { value: 'delay', labelKey: 'report.delay', emoji: '⏰' },
  { value: 'overcrowding', labelKey: 'report.overcrowding', emoji: '😤' },
  { value: 'misbehavior', labelKey: 'report.misbehavior', emoji: '⚠️' },
  { value: 'breakdown', labelKey: 'report.breakdown', emoji: '🔧' },
  { value: 'route-deviation', labelKey: 'report.routeDeviation', emoji: '🛣️' },
  { value: 'other', labelKey: 'report.other', emoji: '📢' },
];

interface PanicButtonProps {
  busId?: string;
  routeNumber?: string;
}

export function PanicButton({ busId, routeNumber }: PanicButtonProps) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [form, setForm] = useState<ReportPayload>({
    type: 'other',
    message: '',
    contact: '',
  });

  const handleSubmit = async () => {
    if (!form.message.trim()) return;
    setSubmitting(true);
    try {
      await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, busId, routeNumber, timestamp: new Date().toISOString() }),
      });
      setDone(true);
      setTimeout(() => { setOpen(false); setDone(false); setForm({ type: 'other', message: '', contact: '' }); }, 2000);
    } catch {} finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-red-600 text-2xl text-white shadow-2xl shadow-red-600/40 transition hover:scale-110 hover:bg-red-500 active:scale-95"
        aria-label="Report an issue"
      >
        🚨
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 pb-8 sm:items-center sm:pb-0">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-[var(--text-primary)]">Report an Issue</h2>
              <button onClick={() => { setOpen(false); setDone(false); }} className="text-2xl text-[var(--text-muted)] hover:text-[var(--text-primary)]">✕</button>
            </div>

            {done ? (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <span className="text-4xl">✅</span>
                <p className="font-semibold text-green-600">Report submitted. Authorities will be notified.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  {REPORT_TYPES.map((rt) => (
                    <button
                      key={rt.value}
                      type="button"
                      onClick={() => setForm(p => ({ ...p, type: rt.value }))}
                      className={`flex flex-col items-center gap-1 rounded-2xl p-3 text-xs transition ${
                        form.type === rt.value
                          ? 'bg-red-50 border-2 border-red-400 text-red-700'
                          : 'bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-secondary)] hover:border-red-200'
                      }`}
                    >
                      <span className="text-xl">{rt.emoji}</span>
                      <span className="font-medium">{rt.labelKey.replace('report.', '')}</span>
                    </button>
                  ))}
                </div>

                <textarea
                  value={form.message}
                  onChange={(e) => setForm(p => ({ ...p, message: e.target.value }))}
                  placeholder="Describe the issue..."
                  rows={3}
                  className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-primary)] p-4 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-red-400/30"
                />

                <input
                  type="text"
                  value={form.contact}
                  onChange={(e) => setForm(p => ({ ...p, contact: e.target.value }))}
                  placeholder="Your phone (optional)"
                  className="w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-red-400/30"
                />

                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting || !form.message.trim()}
                  className="w-full rounded-2xl bg-red-600 py-3 text-sm font-semibold text-white shadow-lg shadow-red-600/30 transition hover:bg-red-500 disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Submit Report'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
