export async function GET() {
  return Response.json({
    status: 'ok',
    service: 'aniva',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
}

