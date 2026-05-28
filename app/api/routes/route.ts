import { getRoutes } from '@/server/routes/routes';

export async function GET() {
  return new Response(JSON.stringify(getRoutes()), {
    headers: { 'Content-Type': 'application/json' }
  });
}
