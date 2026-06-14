'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { useLanguage } from '@/lib/LanguageContext';

export default function SettingsPage() {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [saved, setSaved] = useState(false);
  const [heatmap, setHeatmap] = useState(false);
  const [etaReminders, setEtaReminders] = useState(false);

  useEffect(() => {
    const storedEmail = localStorage.getItem('tn-bustrack-email');
    const storedContact = localStorage.getItem('tn-bustrack-emergency');
    const storedHeatmap = localStorage.getItem('tn-bustrack-heatmap');
    const storedEta = localStorage.getItem('tn-bustrack-eta-reminders');
    if (storedEmail) setEmail(storedEmail);
    if (storedContact) setEmergencyContact(storedContact);
    if (storedHeatmap === 'true') setHeatmap(true);
    if (storedEta === 'true') setEtaReminders(true);
  }, []);

  const handleSave = () => {
    localStorage.setItem('tn-bustrack-email', email);
    localStorage.setItem('tn-bustrack-emergency', emergencyContact);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const toggleHeatmap = () => {
    const next = !heatmap;
    setHeatmap(next);
    localStorage.setItem('tn-bustrack-heatmap', String(next));
  };

  const toggleEtaReminders = () => {
    const next = !etaReminders;
    setEtaReminders(next);
    localStorage.setItem('tn-bustrack-eta-reminders', String(next));
  };

  return (
    <div className="space-y-5 pb-28 max-sm:space-y-4">
      <div className="gradient-header rounded-3xl p-6 shadow-lg shadow-[var(--shadow-heavy)] max-sm:rounded-2xl max-sm:p-5">
        <div className="gradient-header-text">
          <h1 className="text-2xl font-bold text-white max-sm:text-xl">{t('settings.title')}</h1>
          <p className="mt-2 text-sm text-white/70">{t('settings.subtitle')}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 md:gap-6">
        <Card title={t('settings.notifications')} description={t('settings.notificationsDesc')} glow="blue" />
        <Card title={t('settings.mapView')} description={t('settings.mapViewDesc')} glow="teal" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 md:gap-6">
        <div className="glass rounded-3xl p-5 shadow-lg shadow-[var(--shadow-heavy)] max-sm:rounded-2xl max-sm:p-4">
          <div className="space-y-4">
            <Input
              label={t('settings.email')}
              placeholder="admin@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Input
              label={t('settings.emergencyContact')}
              placeholder="+91 98765 43210"
              value={emergencyContact}
              onChange={(e) => setEmergencyContact(e.target.value)}
            />
            <div className="flex items-center gap-3">
              <Button className="mt-2" onClick={handleSave}>{t('settings.saveSettings')}</Button>
              {saved && (
                <span className="mt-2 text-xs font-medium text-[#16A34A] animate-slide-in">
                  ✓ Saved
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="glass rounded-3xl p-5 shadow-lg shadow-[var(--shadow-heavy)] max-sm:rounded-2xl max-sm:p-4">
          <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-[var(--text-secondary)]">{t('settings.mapPrefs')}</p>
          <div className="mt-4 flex flex-col gap-3">
            <button
              type="button"
              onClick={toggleHeatmap}
              className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-sm font-medium transition ${
                heatmap
                  ? 'border-[#0EA5E9]/30 bg-[#0EA5E9]/10 text-[#0EA5E9]'
                  : 'border-[var(--border-subtle)] bg-white/50 text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <span>{t('settings.heatmap')}</span>
              <span className={`h-5 w-5 rounded-full border-2 flex items-center justify-center transition ${
                heatmap ? 'border-[#0EA5E9] bg-[#0EA5E9]' : 'border-[var(--border)]'
              }`}>
                {heatmap && <span className="h-2 w-2 rounded-full bg-white" />}
              </span>
            </button>
            <button
              type="button"
              onClick={toggleEtaReminders}
              className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-sm font-medium transition ${
                etaReminders
                  ? 'border-[#0EA5E9]/30 bg-[#0EA5E9]/10 text-[#0EA5E9]'
                  : 'border-[var(--border-subtle)] bg-white/50 text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <span>{t('settings.etaReminders')}</span>
              <span className={`h-5 w-5 rounded-full border-2 flex items-center justify-center transition ${
                etaReminders ? 'border-[#0EA5E9] bg-[#0EA5E9]' : 'border-[var(--border)]'
              }`}>
                {etaReminders && <span className="h-2 w-2 rounded-full bg-white" />}
              </span>
            </button>
          </div>
        </div>
      </div>

      <div className="glass rounded-3xl p-5 shadow-lg shadow-[var(--shadow-heavy)] max-sm:rounded-2xl max-sm:p-4">
        <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-[var(--text-secondary)]">{t('settings.language')}</p>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">{t('settings.languageDesc')}</p>
        <div className="mt-4">
          <LanguageSwitcher />
        </div>
      </div>
    </div>
  );
}
