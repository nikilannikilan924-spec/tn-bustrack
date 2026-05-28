'use client';

import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { useLanguage } from '@/lib/LanguageContext';

export default function SettingsPage() {
  const { t } = useLanguage();

  return (
    <div className="space-y-5 pb-28 max-sm:space-y-4">
      <div className="relative overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--bg-elevated)] p-6 shadow-lg shadow-[var(--shadow)] backdrop-blur max-sm:rounded-2xl max-sm:p-5">
        <div className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full bg-[#00BCD4]/8 blur-[80px]" />
        <div className="relative">
          <h1 className="text-2xl font-semibold text-[var(--text-primary)] max-sm:text-xl">{t('settings.title')}</h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">{t('settings.subtitle')}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 md:gap-6">
        <Card title={t('settings.notifications')} description={t('settings.notificationsDesc')} glow="red" />
        <Card title={t('settings.mapView')} description={t('settings.mapViewDesc')} glow="teal" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 md:gap-6">
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5 shadow-lg shadow-[var(--shadow)] backdrop-blur max-sm:rounded-2xl max-sm:p-4">
          <div className="space-y-4">
            <Input label={t('settings.email')} placeholder="admin@example.com" />
            <Input label={t('settings.emergencyContact')} placeholder="+1 555 0123" />
            <Button className="mt-2">{t('settings.saveSettings')}</Button>
          </div>
        </div>
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5 shadow-lg shadow-[var(--shadow)] backdrop-blur max-sm:rounded-2xl max-sm:p-4">
          <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-[var(--text-secondary)]">{t('settings.mapPrefs')}</p>
          <div className="mt-4 flex flex-col gap-3">
            <Button variant="outline">{t('settings.heatmap')}</Button>
            <Button variant="outline">{t('settings.etaReminders')}</Button>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5 shadow-lg shadow-[var(--shadow)] backdrop-blur max-sm:rounded-2xl max-sm:p-4">
        <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-[var(--text-secondary)]">{t('settings.language')}</p>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">{t('settings.languageDesc')}</p>
        <div className="mt-4">
          <LanguageSwitcher />
        </div>
      </div>
    </div>
  );
}
