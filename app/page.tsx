'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useLanguage } from '@/lib/LanguageContext';
import { MapIcon, NearbyIcon, PinIcon } from '@/components/ui/Icons';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { subscribeBusLocationUpdate } from '@/lib/socket';

interface LiveBus {
  busId: string;
  lat: number;
  lng: number;
  speed: number;
  currentStop: string;
}

export default function HomePage() {
  const { t, lang } = useLanguage();
  const [buses, setBuses] = useState<LiveBus[]>([]);

  useEffect(() => {
    fetchBuses();
    const unsub = subscribeBusLocationUpdate((payload: any) => {
      const raw = Array.isArray(payload) ? payload : [payload];
      if (Array.isArray(raw)) setBuses(raw);
    });
    return unsub;
  }, []);

  async function fetchBuses() {
    try {
      const res = await fetch('/api/buses');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setBuses(data);
      }
    } catch (_) {}
  }

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
            <Button variant="outline" href="/setup">
              {lang === 'ta' ? 'உங்கள் பேருந்தை அமைக்கவும்' : 'Setup Your Bus'}
            </Button>
            <Button variant="outline" href="/how">
              {lang === 'ta' ? 'எப்படி பயன்படுத்துவது' : 'How to Use'}
            </Button>
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <a href="/map" className="glass group rounded-3xl p-6 shadow-lg transition hover:shadow-xl">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0EA5E9]/10 text-[#0EA5E9]">
            <MapIcon size={24} />
          </div>
          <h3 className="mt-4 font-semibold text-[var(--text-primary)] group-hover:text-[#0EA5E9]">
            {t('map.title')}
          </h3>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            {lang === 'ta' ? 'வரைபடத்தில் நேரலை பேருந்துகளைக் காண்க' : 'View live buses on the map'}
          </p>
        </a>

        <a href="/nearby" className="glass group rounded-3xl p-6 shadow-lg transition hover:shadow-xl">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#00BCD4]/10 text-[#00BCD4]">
            <NearbyIcon size={24} />
          </div>
          <h3 className="mt-4 font-semibold text-[var(--text-primary)] group-hover:text-[#00BCD4]">
            {t('nearby.title')}
          </h3>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            {lang === 'ta' ? 'உங்கள் அருகில் உள்ள நிறுத்தங்கள் மற்றும் பேருந்துகள்' : 'Stops and buses near you'}
          </p>
        </a>

        <a href="/setup" className="glass group rounded-3xl p-6 shadow-lg transition hover:shadow-xl">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#22C55E]/10 text-[#22C55E]">
            <PinIcon size={24} />
          </div>
          <h3 className="mt-4 font-semibold text-[var(--text-primary)] group-hover:text-[#22C55E]">
            {lang === 'ta' ? 'உங்கள் பேருந்தை அமைக்கவும்' : 'Setup Your Bus'}
          </h3>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            {lang === 'ta' ? 'புதிய பேருந்து வழியைச் சேர்க்கவும்' : 'Add a new bus route'}
          </p>
        </a>
      </div>
    </div>
  );
}
