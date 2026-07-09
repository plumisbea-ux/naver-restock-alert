export const corsHeaders = {
  "Cache-Control": "no-store",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};

export async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export function json(data, status = 200) {
  return Response.json(data, {
    status,
    headers: corsHeaders
  });
}

export function empty(status = 204) {
  return new Response(null, { status, headers: corsHeaders });
}

export function isPreflight(request) {
  return request.method === "OPTIONS";
}
