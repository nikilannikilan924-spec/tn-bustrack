'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@/lib/LanguageContext';

interface Stop {
  name: string;
  lat: string;
  lng: string;
}

interface ConfiguredBus {
  busId: string;
  totalSeats: number;
  routeName: string;
  driverName: string;
  busNumber: string;
}

export default function SetupPage() {
  const { t, lang } = useLanguage();

  const [busId, setBusId] = useState('M31');
  const [busNumber, setBusNumber] = useState('');
  const [busName, setBusName] = useState('');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [seatCapacity, setSeatCapacity] = useState('50');
  const [stops, setStops] = useState<Stop[]>([{ name: '', lat: '', lng: '' }]);
  const [bulkText, setBulkText] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [savedBusId, setSavedBusId] = useState('');
  const [configuredBuses, setConfiguredBuses] = useState<ConfiguredBus[]>([]);

  useEffect(() => { fetchConfiguredBuses(); }, []);

  async function fetchConfiguredBuses() {
    try {
      const res = await fetch('/api/config');
      if (res.ok) setConfiguredBuses(await res.json());
    } catch (_) {}
  }

  async function deleteBus(busId: string) {
    try {
      await fetch(`/api/buses/${busId}`, { method: 'DELETE' });
      setMessage(lang === 'ta' ? `${busId} நீக்கப்பட்டது` : `${busId} removed`);
      fetchConfiguredBuses();
    } catch (_) {
      setMessage('Error deleting bus');
    }
  }

  const clearForm = () => {
    setBusNumber('');
    setBusName('');
    setOrigin('');
    setDestination('');
    setSeatCapacity('50');
    setStops([{ name: '', lat: '', lng: '' }]);
    setBulkText('');
    setMessage('');
    setSavedBusId('');
  };

  const addStop = () => setStops([...stops, { name: '', lat: '', lng: '' }]);
  const removeStop = (i: number) => {
    if (stops.length > 1) setStops(stops.filter((_, idx) => idx !== i));
  };
  const updateStop = (i: number, field: keyof Stop, value: string) => {
    const s = [...stops];
    s[i][field] = value;
    setStops(s);
  };

  const importBulk = () => {
    const lines = bulkText.trim().split('\n').filter(Boolean);
    const parsed: Stop[] = [];
    for (const line of lines) {
      const parts = line.split(',').map(s => s.trim());
      if (parts.length >= 3 && parts[0] && parts[1] && parts[2]) {
        parsed.push({ name: parts[0], lat: parts[1], lng: parts[2] });
      }
    }
    if (parsed.length) {
      setStops(parsed);
      setBulkText('');
      setMessage(lang === 'ta' ? `${parsed.length} நிறுத்தங்கள் இறக்குமதி செய்யப்பட்டன` : `${parsed.length} stops imported`);
    } else {
      setMessage(lang === 'ta' ? 'எதுவும் இறக்குமதி செய்யப்படவில்லை. வடிவமைப்பைச் சரிபார்க்கவும்: பெயர், அட்சரேகை, தீர்க்கரேகை' : 'Nothing imported. Check format: Name, lat, lng');
    }
  };

  const loadFromCoords = (i: number) => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      const s = [...stops];
      s[i].lat = pos.coords.latitude.toFixed(6);
      s[i].lng = pos.coords.longitude.toFixed(6);
      setStops(s);
    });
  };

  const save = async () => {
    if (!busNumber || !origin || !destination || stops.some((s) => !s.name || !s.lat || !s.lng)) {
      setMessage(lang === 'ta' ? 'அனைத்து புலங்களையும் நிரப்பவும்' : 'Fill all fields');
      return;
    }

    setSaving(true);
    setMessage('');

    try {
      // 1. Create new route
      const routeBody = {
        number: busNumber,
        name: busName || `${origin} to ${destination}`,
        operator: 'TNSTC',
        busType: 'Standard',
        origin,
        destination,
        status: 'Running',
        stops: stops.map((s, i) => ({
          name: s.name,
          lat: parseFloat(s.lat),
          lng: parseFloat(s.lng),
          sequence: i + 1
        }))
      };
      const routeRes = await fetch('/api/routes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(routeBody)
      });
      const newRoute = await routeRes.json();

      // 3. Create new bus
      const busRes = await fetch('/api/bus/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          number: busNumber,
          busId: busId,
          routeName: busName || `${origin} to ${destination}`,
          latitude: parseFloat(stops[0].lat),
          longitude: parseFloat(stops[0].lng),
          seatCapacity: parseInt(seatCapacity) || 50,
        })
      });
      const busData = await busRes.json();
      setSavedBusId(busNumber || busId);

      setMessage(lang === 'ta' ? 'வெற்றி! ESP32 இல் இந்த Bus ID ஐப் பயன்படுத்தவும்' : 'Success! Use this Bus ID in ESP32 firmware');
    } catch (e) {
      setMessage(lang === 'ta' ? 'பிழை: சேமிக்க முடியவில்லை' : 'Error: Could not save');
    }
    setSaving(false);
  };

  function getVal(s: string) {
    switch (s) {
      case 'setup.title': return lang === 'ta' ? 'உங்கள் பேருந்து வழியை அமைக்கவும்' : 'Setup Your Bus Route';
      case 'setup.subtitle': return lang === 'ta' ? 'உங்கள் கல்லூரி பேருந்தின் விவரங்களை உள்ளிடவும்' : 'Enter your college bus details';
      case 'setup.busNumber': return lang === 'ta' ? 'பேருந்து எண்' : 'Bus Number';
      case 'setup.busName': return lang === 'ta' ? 'வழி பெயர் (விரும்பினால்)' : 'Route Name (optional)';
      case 'setup.origin': return lang === 'ta' ? 'புறப்படும் இடம்' : 'Origin';
      case 'setup.destination': return lang === 'ta' ? 'சேரும் இடம்' : 'Destination';
      case 'setup.seats': return lang === 'ta' ? 'இருக்கை திறன்' : 'Seat Capacity';
      case 'setup.stops': return lang === 'ta' ? 'நிறுத்தங்கள்' : 'Stops';
      case 'setup.stopName': return lang === 'ta' ? 'நிறுத்தத்தின் பெயர்' : 'Stop Name';
      case 'setup.lat': return 'Latitude';
      case 'setup.lng': return 'Longitude';
      case 'setup.currentLoc': return lang === 'ta' ? 'தற்போதைய இடம்' : 'Current Location';
      case 'setup.addStop': return lang === 'ta' ? 'நிறுத்தத்தை சேர்' : 'Add Stop';
      case 'setup.remove': return lang === 'ta' ? 'அகற்று' : 'Remove';
      case 'setup.save': return lang === 'ta' ? 'சேமி & வெளியிடு' : 'Save & Publish';
      case 'setup.saving': return lang === 'ta' ? 'சேமிக்கிறது...' : 'Saving...';
      default: return s;
    }
  }

  return (
    <div className="space-y-6 pt-4">
      <div className="rounded-3xl bg-white/80 p-6 shadow-lg backdrop-blur-xl sm:p-8">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">{getVal('setup.title')}</h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">{getVal('setup.subtitle')}</p>
      </div>

      <div className="rounded-3xl bg-white/80 p-6 shadow-lg backdrop-blur-xl sm:p-8">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)]">Bus ID (must match ESP32)</label>
            <input value={busId} onChange={(e) => setBusId(e.target.value)}
              className="mt-1 w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none focus:border-[#0EA5E9]" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)]">{getVal('setup.busNumber')}</label>
            <input value={busNumber} onChange={(e) => setBusNumber(e.target.value)}
              className="mt-1 w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none focus:border-[#0EA5E9]" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)]">{getVal('setup.busName')}</label>
            <input value={busName} onChange={(e) => setBusName(e.target.value)}
              className="mt-1 w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none focus:border-[#0EA5E9]" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)]">{getVal('setup.origin')}</label>
            <input value={origin} onChange={(e) => setOrigin(e.target.value)}
              className="mt-1 w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none focus:border-[#0EA5E9]" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)]">{getVal('setup.destination')}</label>
            <input value={destination} onChange={(e) => setDestination(e.target.value)}
              className="mt-1 w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none focus:border-[#0EA5E9]" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-[var(--text-secondary)]">{getVal('setup.seats')}</label>
            <input type="number" value={seatCapacity} onChange={(e) => setSeatCapacity(e.target.value)}
              className="mt-1 w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none focus:border-[#0EA5E9]" />
          </div>
        </div>
      </div>

      <div className="rounded-3xl bg-white/80 p-6 shadow-lg backdrop-blur-xl sm:p-8">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-[var(--text-primary)]">{getVal('setup.stops')}</h2>
          <button onClick={addStop} className="rounded-xl bg-[#0EA5E9]/10 px-4 py-2 text-xs font-semibold text-[#0EA5E9] hover:bg-[#0EA5E9]/20">
            + {getVal('setup.addStop')}
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {stops.map((stop, i) => (
            <div key={i} className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[var(--text-muted)]">Stop {i + 1}</span>
                {stops.length > 1 && (
                  <button onClick={() => removeStop(i)} className="text-xs text-red-500 hover:underline">{getVal('setup.remove')}</button>
                )}
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-4">
                <div className="sm:col-span-2">
                  <label className="block text-[10px] text-[var(--text-muted)]">{getVal('setup.stopName')}</label>
                  <input value={stop.name} onChange={(e) => updateStop(i, 'name', e.target.value)}
                    className="mt-1 w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-[#0EA5E9]" />
                </div>
                <div>
                  <label className="block text-[10px] text-[var(--text-muted)]">{getVal('setup.lat')}</label>
                  <input value={stop.lat} onChange={(e) => updateStop(i, 'lat', e.target.value)}
                    className="mt-1 w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-[#0EA5E9]" />
                </div>
                <div>
                  <label className="block text-[10px] text-[var(--text-muted)]">{getVal('setup.lng')}</label>
                  <div className="mt-1 flex gap-2">
                    <input value={stop.lng} onChange={(e) => updateStop(i, 'lng', e.target.value)}
                      className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm outline-none focus:border-[#0EA5E9]" />
                    <button onClick={() => loadFromCoords(i)}
                      className="shrink-0 rounded-xl bg-[#0EA5E9]/10 px-3 text-xs font-semibold text-[#0EA5E9] hover:bg-[#0EA5E9]/20">
                      📡
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-3xl bg-white/80 p-6 shadow-lg backdrop-blur-xl sm:p-8">
        <h2 className="font-semibold text-[var(--text-primary)]">
          {lang === 'ta' ? 'மொத்தமாக நிறுத்தங்களை இறக்குமதி செய்க' : 'Bulk Import Stops'}
        </h2>
        <p className="mt-1 text-xs text-[var(--text-secondary)]">
          {lang === 'ta'
            ? 'ஒவ்வொரு வரியிலும்: நிறுத்தத்தின் பெயர், அட்சரேகை, தீர்க்கரேகை (எ.கா: Tambaram, 12.9240, 80.1003)'
            : 'One stop per line: Name, latitude, longitude (e.g. Tambaram, 12.9240, 80.1003)'}
        </p>
        <textarea value={bulkText} onChange={(e) => setBulkText(e.target.value)}
          rows={6}
          className="mt-3 w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none focus:border-[#0EA5E9] font-mono"
          placeholder={lang === 'ta' ? 'Tambaram, 12.9240, 80.1003\nChromepet, 12.9518, 80.1493\n...' : 'Tambaram, 12.9240, 80.1003\nChromepet, 12.9518, 80.1493\n...'} />
        <button onClick={importBulk} disabled={!bulkText.trim()}
          className="mt-2 rounded-xl bg-[#22C55E]/10 px-4 py-2 text-xs font-semibold text-[#22C55E] hover:bg-[#22C55E]/20 disabled:opacity-40">
          {lang === 'ta' ? 'இறக்குமதி செய்க' : 'Import'}
        </button>
      </div>

      {message && (
        <div className={`rounded-2xl p-4 text-sm font-medium ${message.includes('Error') || message.includes('பிழை') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
          {message}
        </div>
      )}

      {configuredBuses.length > 0 && (
        <div className="rounded-3xl bg-white/80 p-6 shadow-lg backdrop-blur-xl sm:p-8">
          <h2 className="font-semibold text-[var(--text-primary)]">
            {lang === 'ta' ? 'கட்டமைக்கப்பட்ட பேருந்துகள்' : 'Configured Buses'}
          </h2>
          <div className="mt-4 space-y-2">
            {configuredBuses.map((cfg) => (
              <div key={cfg.busId} className="flex items-center justify-between rounded-xl bg-[var(--overlay-subtle)] px-4 py-3">
                <div>
                  <span className="text-sm font-medium text-[var(--text-primary)]">{cfg.busId}</span>
                  <span className="ml-2 text-xs text-[var(--text-secondary)]">{cfg.routeName}</span>
                </div>
                <button onClick={() => deleteBus(cfg.busId)}
                  className="rounded-lg bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-500/20">
                  {lang === 'ta' ? 'அகற்று' : 'Remove'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {savedBusId && (
        <div className="rounded-3xl border-2 border-[#0EA5E9] bg-[#0EA5E9]/5 p-6 shadow-lg backdrop-blur-xl">
          <h3 className="text-sm font-bold text-[#0EA5E9]">
            {lang === 'ta' ? 'ESP32 உங்கள் பேருந்து ஐடி' : 'ESP32 — Your Bus ID'}
          </h3>
          <p className="mt-3 font-mono text-2xl font-bold tracking-wider text-[var(--text-primary)]">
            {savedBusId}
          </p>
          <p className="mt-2 text-xs text-[var(--text-secondary)]">
            {lang === 'ta'
              ? 'இந்த ஐடியை ESP32 குறியீட்டில் busId ஆக பயன்படுத்தவும். பக்கம் புதுப்பிக்கப்படும் வரை நகலெடுக்கவும்.'
              : 'Use this as busId in the ESP32 firmware. Copy it before the page refreshes.'}
          </p>
        </div>
      )}

      <div className="flex gap-3">
        <button onClick={clearForm}
          className="flex-1 rounded-2xl border border-[var(--border)] bg-white/50 py-4 text-sm font-bold text-[var(--text-secondary)] shadow-lg transition hover:bg-white/80">
          {lang === 'ta' ? 'படிவத்தை அழி' : 'Clear Form'}
        </button>
        <button onClick={save} disabled={saving}
          className="flex-1 rounded-2xl bg-[#0EA5E9] py-4 text-sm font-bold text-white shadow-lg transition hover:bg-[#0284C7] disabled:opacity-50">
          {saving ? getVal('setup.saving') : getVal('setup.save')}
        </button>
      </div>
    </div>
  );
}
