'use client';

import { useEffect, useState, useRef } from 'react';
import { getMockDashboardData, type Bus } from '@/lib/mock-data';
import { subscribeBusLocationUpdate } from '@/lib/socket';

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
  const { buses: seedBuses } = getMockDashboardData();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [buses] = useState<Bus[]>(seedBuses);

  useEffect(() => {
    setActivities([
      { id: 'init-1', type: 'arrival', message: 'Bus TN01 5D 4821 arrived Marina Beach', busNumber: 'TN01 5D 4821', timestamp: new Date() },
      { id: 'init-2', type: 'delay', message: 'Bus 570 — delayed 11 mins at Alandur', busNumber: 'TN01 570 2041', timestamp: new Date(Date.now() - 30000) },
      { id: 'init-3', type: 'seats', message: 'Bus 21B — 17 seats available', busNumber: 'TN10 21B 3310', timestamp: new Date(Date.now() - 60000) },
    ]);
  }, []);

  useEffect(() => {
    const events: Activity['type'][] = ['arrival', 'seats', 'delay', 'departure'];
    const timer = setInterval(() => {
      const bus = buses[Math.floor(Math.random() * buses.length)];
      const eventType = events[Math.floor(Math.random() * events.length)];
      setActivities((prev) => [generateActivity(bus, eventType), ...prev].slice(0, 20));
    }, 5000);
    return () => clearInterval(timer);
  }, [buses]);

  useEffect(() => {
    const unsubscribe = subscribeBusLocationUpdate((payload: Bus[] | { buses: Bus[] }) => {
      const liveBuses = Array.isArray(payload) ? payload : payload.buses;
      if (!Array.isArray(liveBuses)) return;
      const changed = liveBuses.filter((b) => {
        const old = seedBuses.find((s) => s.id === b.id);
        return old && (old.currentStop !== b.currentStop || old.status !== b.status);
      });
      if (changed.length) {
        const bus = changed[0];
        setActivities((prev) => [
          generateActivity(bus, bus.status === 'delayed' ? 'delay' : 'arrival'),
          ...prev
        ].slice(0, 20));
      }
    });
    return unsubscribe;
  }, [seedBuses]);

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
