export const dynamic = 'force-dynamic';

export async function GET() {
  const positions = (global as any).__busPositions;
  const buses = positions ? Object.values(positions) : [];
  return new Response(JSON.stringify(buses), {
    headers: { 'Content-Type': 'application/json' }
  });
}
