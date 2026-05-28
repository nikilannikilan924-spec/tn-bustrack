export async function POST(request: Request) {
  const body = await request.json();
  return new Response(JSON.stringify({ message: 'Admin alert created', payload: body }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' }
  });
}
