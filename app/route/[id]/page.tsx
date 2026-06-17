'use client';

import { useEffect, useState } from 'react';
import { notFound } from 'next/navigation';
import { fetchStops } from '@/lib/types';
import type { Stop, Route } from '@/lib/types';
import { Card } from '@/components/ui/Card';

interface RoutePageProps {
  params: { id: string };
}

export default function RouteDetailPage({ params }: RoutePageProps) {
  const [route, setRoute] = useState<Route | null>(null);
  const [stops, setStops] = useState<Stop[]>([]);

  useEffect(() => {
    fetchStops().then(allStops => {
      setStops(allStops);
      const routeStops = allStops.filter(s => s.routeId === params.id);
      if (routeStops.length > 0) {
        setRoute({
          id: params.id,
          number: params.id.replace('route-', '').toUpperCase(),
          name: params.id.replace('route-', 'Route ').replace(/-/g, ' '),
          operator: 'TNSTC',
          busType: 'Normal',
          origin: routeStops[0].name,
          destination: routeStops[routeStops.length - 1].name,
          status: 'active',
          stops: routeStops,
        });
      }
    });
  }, [params.id]);

  if (route === null) {
    return (
      <div className="space-y-6 p-6">
        <div className="rounded-3xl border border-white/10 bg-slate-900/75 p-8 shadow-soft backdrop-blur">
          <p className="text-slate-400">Loading route...</p>
        </div>
      </div>
    );
  }

  if (!route) {
    notFound();
  }

  const routeStops = stops.filter((stop) => stop.routeId === route.id);

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-white/10 bg-slate-900/75 p-8 shadow-soft backdrop-blur">
        <h1 className="text-3xl font-semibold text-white">Route {route.number}: {route.name}</h1>
        <p className="mt-2 text-slate-300">Origin: {route.origin} • Destination: {route.destination}</p>
        <p className="mt-3 text-slate-400">Service status: <span className="font-semibold text-sky-300">{route.status}</span></p>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Upcoming stops" description={`${routeStops.length} stops remaining`}>
          <ul className="mt-4 space-y-3 text-sm text-slate-300">
            {routeStops.map((stop) => (
              <li key={stop.id} className="rounded-2xl bg-slate-950/70 p-3">{stop.sequence}. {stop.name}</li>
            ))}
          </ul>
        </Card>
        <Card title="Service details" description="Route metrics and live status summary." />
      </div>
    </div>
  );
}
