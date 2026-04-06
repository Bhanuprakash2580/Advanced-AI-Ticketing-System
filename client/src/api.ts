const base = import.meta.env.VITE_API_URL || '';

async function handleResponse(r: Response) {
  if (!r.ok) {
    let err = await r.text();
    try { 
      const parsed = JSON.parse(err);
      err = parsed.detail || parsed.message || err;
    } catch (e) {
      // ignore JSON parse error
    }
    throw new Error(err || `API request failed with status ${r.status}`);
  }
}

export async function apiGet<T>(path: string): Promise<T> {
  const r = await fetch(`${base}${path}`);
  await handleResponse(r);
  return r.json() as Promise<T>;
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const r = await fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  await handleResponse(r);
  return r.json() as Promise<T>;
}

export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  const r = await fetch(`${base}${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  await handleResponse(r);
  return r.json() as Promise<T>;
}

export async function apiDelete<T>(path: string): Promise<T> {
  const r = await fetch(`${base}${path}`, {
    method: 'DELETE',
  });
  await handleResponse(r);
  return r.json() as Promise<T>;
}

