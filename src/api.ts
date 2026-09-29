type ApiResponse<T = unknown> = { data: T; status: number };

async function request<T = unknown>(method: 'GET' | 'POST', url: string, body?: unknown): Promise<ApiResponse<T>> {
  const response = await fetch(url, {
    method,
    headers: body === undefined ? undefined : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let data: any = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { ok: response.ok, raw: text }; }
  return { data, status: response.status };
}

export const api = {
  get<T = unknown>(url: string) { return request<T>('GET', url); },
  post<T = unknown>(url: string, body?: unknown) { return request<T>('POST', url, body); },
};
