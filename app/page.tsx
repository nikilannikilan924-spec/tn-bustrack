'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useLanguage } from '@/lib/LanguageContext';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { getMockDashboardData, type Bus } from '@/lib/mock-data';
import { subscribeBusLocationUpdate } from '@/lib/socket';

export default function HomePage() {
  const { t, lang } = useLanguage();
  const { buses: seedBuses, routes, alerts } = useMemo(() => getMockDashboardData(), []);
  const [buses, setBuses] = useState<Bus[]>(seedBuses);

  useEffect(() => {
    const unsub = subscribeBusLocationUpdate((payload: Bus[] | { buses: Bus[] }) => {
      const liveBuses = Array.isArray(payload) ? payload : payload.buses;
      if (Array.isArray(liveBuses)) setBuses(liveBuses);
    });
    return unsub;
  }, []);

  const running = buses.filter((b) => b.status === 'running').length;
  const delayed = buses.filter((b) => b.status === 'delayed').length;
  const stopped = buses.filter((b) => b.status === 'stopped').length;
  const totalSeats = buses.reduce((s, b) => s + b.seatsAvailable, 0);
  const recentAlerts = alerts.slice(0, 3);

  return (
    <div className="space-y-5 pt-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-orbitron text-[10px] uppercase tracking-[0.3em] text-[var(--text-secondary)]">
            {t('app.name')}
          </p>
          <h1 className="mt-1 text-2xl font-bold text-[var(--text-primary)] sm:text-4xl">
            {lang === 'ta' ? 'வணக்கம்' : 'Welcome'}
          </h1>
        </div>
        <LanguageSwitcher />
      </div>

      <section className="relative overflow-hidden rounded-3xl bg-white/80 p-6 shadow-lg backdrop-blur-xl sm:p-8">
        <div className="relative">
          <div className="flex items-center gap-2">
            <span className="live-dot" />
            <span className="text-xs font-semibold text-[#0EA5E9]">
              {buses.length} {lang === 'ta' ? 'பேருந்துகள் நேரலையில்' : 'buses live'}
            </span>
          </div>
          <p className="mt-3 text-sm text-[var(--text-secondary)]">
            {lang === 'ta'
              ? 'தமிழ்நாடு பேருந்துகளை நேரலை GPS, இருக்கை தகவல் மற்றும் நிறுத்த கால அட்டவணையுடன் கண்காணிக்கவும்'
              : 'Track Tamil Nadu buses with live GPS, seat availability, and stop timetables'}
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button href="/map">{t('home.liveMap')}</Button>
            <Button variant="outline" href="/dashboard">{t('home.openBuses')}</Button>
            <Button variant="outline" href="/how">
              {lang === 'ta' ? 'எப்படி பயன்படுத்துவது' : 'How to Use'}
            </Button>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card title={lang === 'ta' ? 'இயக்கத்தில்' : 'Running'} value={String(running)} glow="teal" />
        <Card title={lang === 'ta' ? 'தாமதம்' : 'Delayed'} value={String(delayed)} glow="amber" />
        <Card title={lang === 'ta' ? 'நிறுத்தப்பட்டது' : 'Stopped'} value={String(stopped)} />
        <Card title={lang === 'ta' ? 'காலி இருக்கைகள்' : 'Free Seats'} value={String(totalSeats)} glow="blue" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <a href="/map" className="glass group rounded-3xl p-6 shadow-lg transition hover:shadow-xl">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0EA5E9]/10 text-2xl">
            🗺️
          </div>
          <h3 className="mt-4 font-semibold text-[var(--text-primary)] group-hover:text-[#0EA5E9]">
            {t('map.title')}
          </h3>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            {lang === 'ta' ? 'வரைபடத்தில் நேரலை பேருந்துகளைக் காண்க' : 'View live buses on the map'}
          </p>
        </a>

        <a href="/nearby" className="glass group rounded-3xl p-6 shadow-lg transition hover:shadow-xl">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#00BCD4]/10 text-2xl">
            📡
          </div>
          <h3 className="mt-4 font-semibold text-[var(--text-primary)] group-hover:text-[#00BCD4]">
            {t('nearby.title')}
          </h3>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            {lang === 'ta' ? 'உங்கள் அருகில் உள்ள நிறுத்தங்கள் மற்றும் பேருந்துகள்' : 'Stops and buses near you'}
          </p>
        </a>

        <a href="/stops" className="glass group rounded-3xl p-6 shadow-lg transition hover:shadow-xl">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#22C55E]/10 text-2xl">
            📍
          </div>
          <h3 className="mt-4 font-semibold text-[var(--text-primary)] group-hover:text-[#22C55E]">
            {t('stops.title')}
          </h3>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            {lang === 'ta' ? 'நிறுத்த கால அட்டவணை மற்றும் பேருந்து வருகை நேரம்' : 'Stop timetables and bus arrivals'}
          </p>
        </a>
      </div>

      {recentAlerts.length > 0 && (
        <section className="rounded-3xl bg-white/80 p-6 shadow-lg backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-[var(--text-primary)]">{t('alerts.heading')}</h2>
            <a href="/alerts" className="text-xs text-[#0EA5E9] hover:underline">
              {lang === 'ta' ? 'அனைத்தும் காண்க' : 'View all'}
            </a>
          </div>
          <div className="mt-4 space-y-2">
            {recentAlerts.map((alert) => (
              <div key={alert.id} className="rounded-xl bg-[var(--overlay-subtle)] px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${
                    alert.severity === 'CRITICAL' ? 'bg-red-500' : alert.severity === 'WARNING' ? 'bg-amber-500' : 'bg-blue-500'
                  }`} />
                  <span className="text-sm font-medium text-[var(--text-primary)]">{alert.title}</span>
                </div>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">{alert.message}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="flex justify-center pb-8">
        <a
          href="/how"
          className="rounded-2xl border border-[var(--border)] bg-white/50 px-6 py-3 text-xs font-semibold text-[var(--text-secondary)] transition hover:bg-white/80"
        >
          {lang === 'ta' ? ' TN BusTrack பற்றி மேலும் அறிக' : 'Learn more about TN BusTrack'}
        </a>
      </div>
    </div>
  );
}
