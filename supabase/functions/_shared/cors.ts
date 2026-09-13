// Shared CORS configuration with dynamic origin validation

const DEFAULT_ALLOWED_ORIGINS = [
  'https://synapz-beta.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
];

export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') || '';
  const envOrigins = Deno.env.get('ALLOWED_ORIGINS')
    ? Deno.env.get('ALLOWED_ORIGINS')!.split(',').map((o) => o.trim())
    : [];

  const allowedOrigins = [...DEFAULT_ALLOWED_ORIGINS, ...envOrigins];

  // Match exact origin or allow vercel preview deployments matching synapz*.vercel.app
  const isAllowed =
    allowedOrigins.includes(origin) ||
    /^https:\/\/synapz-[a-z0-9-]+-mishraji018s-projects\.vercel\.app$/.test(origin);

  const matchedOrigin = isAllowed ? origin : allowedOrigins[0];

  return {
    'Access-Control-Allow-Origin': matchedOrigin,
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Max-Age': '86400',
  };
}

export function handleCorsPreflight(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      status: 200,
      headers: getCorsHeaders(req),
    });
  }
  return null;
}
