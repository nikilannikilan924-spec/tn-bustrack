import { createFavorite, getFavorites } from '@/server/routes/favorites';

export async function GET() {
  return new Response(JSON.stringify(getFavorites()), {
    headers: { 'Content-Type': 'application/json' }
  });
}

export async function POST(request: Request) {
  const payload = await request.json();
  const favorite = createFavorite(payload);
  return new Response(JSON.stringify(favorite), {
    status: 201,
    headers: { 'Content-Type': 'application/json' }
  });
}
