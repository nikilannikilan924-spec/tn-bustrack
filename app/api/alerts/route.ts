import { getAlerts } from '@/server/routes/alerts';

export async function GET() {
  return new Response(JSON.stringify(getAlerts()), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=10'
    }
  });
}
