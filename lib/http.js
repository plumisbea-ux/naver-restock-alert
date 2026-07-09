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
    headers: {
      "Cache-Control": "no-store"
    }
  });
}
