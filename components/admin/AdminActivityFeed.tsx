'use client';

import { useEffect, useState, useRef } from 'react';
import { subscribeBusLocationUpdate } from '@/lib/socket';
import { fetchBuses, fetchStops, normalizeAPIBus } from '@/lib/types';
import type { Bus } from '@/lib/types';

interface Activity {
  id: string;
  type: 'arrival' | 'seats' | 'delay' | 'departure';
  message: string;
  busNumber: string;
  timestamp: Date;
}

function generateActivity(bus: Bus, eventType: Activity['type']): Activity {
  const messages: Record<Activity['type'], string> = {
    arrival: `Bus ${bus.number} arrived ${bus.currentStop}`,
    seats: `Bus ${bus.number} — ${bus.seatsAvailable} seats left`,
    delay: `Bus ${bus.number} delayed ${bus.etaMinutes} mins`,
    departure: `Bus ${bus.number} departed ${bus.route.origin}`
  };
  return {
    id: `${bus.id}-${Date.now()}-${Math.random()}`,
    type: eventType,
    message: messages[eventType],
    busNumber: bus.number,
    timestamp: new Date()
  };
}

const typeDots: Record<Activity['type'], string> = {
  arrival: '🟢', seats: '🟡', delay: '🔴', departure: '🔵'
};

const typeColors: Record<Activity['type'], string> = {
  arrival: 'text-green-400', seats: 'text-yellow-300', delay: 'text-red-500', departure: 'text-cyan-400'
};

export function AdminActivityFeed() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [buses, setBuses] = useState<Bus[]>([]);
  const busesRef = useRef<Bus[]>([]);

  useEffect(() => {
    setActivities([
      { id: 'init-1', type: 'arrival', message: 'System initialized — bus tracking active', busNumber: 'TN BusTrack', timestamp: new Date() },
    ]);
    fetchStops().then(async allStops => {
      const apiBuses = await fetchBuses(allStops);
      setBuses(apiBuses);
      busesRef.current = apiBuses;
    });
  }, []);

  useEffect(() => {
    const events: Activity['type'][] = ['arrival', 'seats', 'delay', 'departure'];
    const timer = setInterval(() => {
      const current = busesRef.current;
      if (current.length === 0) return;
      const bus = current[Math.floor(Math.random() * current.length)];
      const eventType = events[Math.floor(Math.random() * events.length)];
      setActivities((prev) => [generateActivity(bus, eventType), ...prev].slice(0, 20));
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchStops().then(allStops => {
      const unsubscribe = subscribeBusLocationUpdate((payload: any) => {
        const raw = Array.isArray(payload) ? payload : [payload];
        const live = raw.map(b => normalizeAPIBus(b, allStops));
        setBuses(live);
        busesRef.current = live;
        if (live.length && raw.length) {
          const bus = live[0];
          setActivities((prev) => [
            generateActivity(bus, bus.speed > 0 ? 'arrival' : 'delay'),
            ...prev
          ].slice(0, 20));
        }
      });
      return unsubscribe;
    });
  }, []);

  return (
    <div className="rounded-2xl border border-white/5 bg-[#1A2235] p-5">
      <div className="mb-4 flex items-center gap-2">
        <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-400" />
        <h3 className="font-orbitron text-xs font-semibold uppercase tracking-[0.2em] text-[#F0F4FF]">Live Activity</h3>
      </div>
      <div className="space-y-2 overflow-y-auto" style={{ maxHeight: 340 }}>
        {activities.map((a) => (
          <div key={a.id} className="flex items-start gap-3 rounded-xl bg-[#111827] p-3 slide-in">
            <span className="mt-0.5 text-xs">{typeDots[a.type]}</span>
            <div className="min-w-0 flex-1">
              <p className={`text-xs font-medium ${typeColors[a.type]}`}>{a.message}</p>
              <p className="mt-0.5 font-jetbrains text-[10px] text-[#8892A4]">
                {a.timestamp.toLocaleTimeString('en-IN', { hour12: false })}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
