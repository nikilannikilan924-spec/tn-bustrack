import type { Bus } from '@/lib/types';

interface AdminMapPreviewProps {
  buses: Bus[];
  routesCount: number;
}

export function AdminMapPreview({ buses, routesCount }: AdminMapPreviewProps) {
  return (
    <div className="rounded-2xl border border-white/5 bg-[#1A2235] p-5">
      <div className="mb-4 flex items-center gap-2">
        <span className="h-2 w-2 animate-pulse rounded-full bg-green-400" />
        <h3 className="font-orbitron text-xs font-semibold uppercase tracking-[0.2em] text-[#F0F4FF]">
          Live Bus Positions
        </h3>
        <span className="ml-auto font-jetbrains text-[10px] text-[#8892A4]">
          Refreshing every 5s
        </span>
      </div>
      <div className="relative flex h-[320px] items-center justify-center overflow-hidden rounded-xl bg-[#0A0F1E]">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative h-full w-full">
            <img
              src="https://cartodb-basemaps-a.global.ssl.fastly.net/dark_matter/10/550/375.png"
              alt="Map"
              className="h-full w-full object-cover opacity-40"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#1A2235] via-transparent to-transparent" />
            {buses.map((bus) => (
              <div
                key={bus.id}
                className="absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full"
                style={{
                  left: `${((bus.longitude + 180) / 360) * 100}%`,
                  top: `${((90 - bus.latitude) / 180) * 100}%`,
                  background: bus.status === 'running' ? '#00BCD4' : bus.status === 'delayed' ? '#0EA5E9' : '#FFB300',
                  boxShadow: `0 0 8px ${bus.status === 'running' ? 'rgba(0,188,212,0.7)' : bus.status === 'delayed' ? 'rgba(14,165,233,0.7)' : 'rgba(255,179,0,0.7)'}`,
                  animation: bus.status === 'running' ? 'pulse-dot 2s infinite' : 'none'
                }}
              />
            ))}
          </div>
        </div>
        <p className="relative z-10 text-xs text-[#8892A4]">
          {buses.length} buses • {routesCount} routes
        </p>
      </div>
    </div>
  );
}
