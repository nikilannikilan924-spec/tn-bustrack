'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLanguage } from '@/lib/LanguageContext';
import { useAuth } from '@/lib/AuthContext';
import { UsersIcon } from '@/components/ui/Icons';

export default function RegisterPage() {
  const { t, lang } = useLanguage();
  const { register } = useAuth();
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) { setError(t('auth.registerError') + ': fill all fields'); return; }
    setBusy(true);
    setError('');
    try {
      await register(name, email, password);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.registerError'));
    }
    setBusy(false);
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center pt-4">
      <div className="w-full max-w-md rounded-3xl bg-white/80 p-8 shadow-lg backdrop-blur-xl">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#22C55E]/10 text-[#22C55E]">
            <UsersIcon size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">{t('auth.registerTitle')}</h1>
            <p className="text-xs text-[var(--text-secondary)]">{t('auth.registerSub')}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)]">{t('auth.name')}</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none focus:border-[#0EA5E9]" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)]">{t('auth.email')}</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none focus:border-[#0EA5E9]" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)]">{t('auth.password')}</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none focus:border-[#0EA5E9]" />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button type="submit" disabled={busy}
            className="w-full rounded-2xl bg-[#22C55E] py-4 text-sm font-bold text-white shadow-lg transition hover:bg-[#16A34A] disabled:opacity-50">
            {busy ? '...' : t('auth.signup')}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-[var(--text-secondary)]">
          {t('auth.hasAccount')}{' '}
          <Link href="/login" className="font-semibold text-[#0EA5E9] hover:underline">{t('auth.signin')}</Link>
        </p>
      </div>
    </div>
  );
}
