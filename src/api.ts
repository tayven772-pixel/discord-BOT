type ApiResponse<T = unknown> = { data: T; status: number };

function proxiedUrl(url: string) {
  if (!url.startsWith('/api/')) return url;
  const path = url.slice('/api/'.length);
  return '/api/proxy?path=' + encodeURIComponent(path);
}

async function request<T = unknown>(method: 'GET' | 'POST', url: string, body?: unknown): Promise<ApiResponse<T>> {
  const response = await fetch(proxiedUrl(url), {
    method,
    headers: body === undefined ? undefined : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const text = await response.text();
  let data: any;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error('Meta backend returned an invalid response.');
  }

  return { data, status: response.status };
}

export const api = {
  get<T = unknown>(url: string) {
    return request<T>('GET', url);
  },
  post<T = unknown>(url: string, body?: unknown) {
    return request<T>('POST', url, body);
  },
};
