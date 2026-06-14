import { getStops } from '@/server/routes/stops';

export async function GET() {
  return new Response(JSON.stringify(getStops()), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, s-maxage=3600, immutable'
    }
  });
}
