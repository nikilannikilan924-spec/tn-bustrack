import { getBuses } from '@/server/routes/buses';

export async function GET() {
  return new Response(JSON.stringify(getBuses()), {
    headers: { 'Content-Type': 'application/json' }
  });
}
