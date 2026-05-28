import { deleteFavorite } from '@/server/routes/favorites';

interface Params {
  params: { id: string };
}

export async function DELETE(_request: Request, { params }: Params) {
  const deleted = deleteFavorite(params.id);
  return new Response(JSON.stringify({ deleted }), {
    status: deleted ? 200 : 404,
    headers: { 'Content-Type': 'application/json' }
  });
}
