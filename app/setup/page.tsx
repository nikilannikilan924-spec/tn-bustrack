'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@/lib/LanguageContext';

interface Stop {
  name: string;
  lat: string;
  lng: string;
}

export default function SetupPage() {
  const { t, lang } = useLanguage();

  const [busNumber, setBusNumber] = useState('');
  const [busName, setBusName] = useState('');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [seatCapacity, setSeatCapacity] = useState('50');
  const [stops, setStops] = useState<Stop[]>([{ name: '', lat: '', lng: '' }]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const addStop = () => setStops([...stops, { name: '', lat: '', lng: '' }]);
  const removeStop = (i: number) => {
    if (stops.length > 1) setStops(stops.filter((_, idx) => idx !== i));
  };
  const updateStop = (i: number, field: keyof Stop, value: string) => {
    const s = [...stops];
    s[i][field] = value;
    setStops(s);
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
      // 1. Delete all existing routes
      const routesRes = await fetch('/api/routes');
      const routes = await routesRes.json();
      for (const r of routes) {
        await fetch(`/api/routes/${r._id || r.id}`, { method: 'DELETE' });
      }

      // 2. Delete all existing buses
      const busesRes = await fetch('/api/buses');
      const buses = await busesRes.json();
      for (const b of buses) {
        await fetch(`/api/buses/${b._id || b.id}`, { method: 'DELETE' });
      }

      // 3. Create new route
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
      const routeId = newRoute._id || newRoute.id;

      // 4. Create new bus
      await fetch('/api/buses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          number: busNumber,
          routeId,
          latitude: stops[0].lat,
          longitude: stops[0].lng,
          status: 'stopped',
          seatCapacity: parseInt(seatCapacity) || 50,
          seatsAvailable: parseInt(seatCapacity) || 50,
          passengersInside: 0,
          speed: 0,
          pathIndex: 0,
          currentStop: stops[0].name
        })
      });

      setMessage(lang === 'ta' ? 'வெற்றி! பக்கம் புதுப்பிக்கப்படுகிறது...' : 'Success! Refreshing page...');
      setTimeout(() => window.location.reload(), 1500);
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

      {message && (
        <div className={`rounded-2xl p-4 text-sm font-medium ${message.includes('Error') || message.includes('பிழை') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
          {message}
        </div>
      )}

      <button onClick={save} disabled={saving}
        className="w-full rounded-2xl bg-[#0EA5E9] py-4 text-sm font-bold text-white shadow-lg transition hover:bg-[#0284C7] disabled:opacity-50">
        {saving ? getVal('setup.saving') : getVal('setup.save')}
      </button>
    </div>
  );
}
