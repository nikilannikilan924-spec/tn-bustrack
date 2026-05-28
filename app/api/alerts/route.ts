import { getAlerts } from '@/server/routes/alerts';

export async function GET() {
  return new Response(JSON.stringify(getAlerts()), {
    headers: { 'Content-Type': 'application/json' }
  });
}
