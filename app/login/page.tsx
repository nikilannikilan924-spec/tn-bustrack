'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLanguage } from '@/lib/LanguageContext';
import { useAuth } from '@/lib/AuthContext';
import { LogInIcon } from '@/components/ui/Icons';

export default function LoginPage() {
  const { t, lang } = useLanguage();
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError(t('auth.error')); return; }
    setBusy(true);
    setError('');
    try {
      await login(email, password);
      router.push('/dashboard');
    } catch {
      setError(t('auth.error'));
    }
    setBusy(false);
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center pt-4">
      <div className="w-full max-w-md rounded-3xl bg-white/80 p-8 shadow-lg backdrop-blur-xl">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0EA5E9]/10 text-[#0EA5E9]">
            <LogInIcon size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">{t('auth.loginTitle')}</h1>
            <p className="text-xs text-[var(--text-secondary)]">{t('auth.loginSub')}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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
            className="w-full rounded-2xl bg-[#0EA5E9] py-4 text-sm font-bold text-white shadow-lg transition hover:bg-[#0284C7] disabled:opacity-50">
            {busy ? '...' : t('auth.signin')}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-[var(--text-secondary)]">
          {t('auth.noAccount')}{' '}
          <Link href="/register" className="font-semibold text-[#0EA5E9] hover:underline">{t('auth.signup')}</Link>
        </p>
      </div>
    </div>
  );
}
