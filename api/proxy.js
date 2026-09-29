const API_BASE = 'https://api-v2.appdeploy.ai/app/codepath-j9fln5';

export default async function handler(req, res) {
  const raw = req.query.path;
  const path = Array.isArray(raw) ? raw.join('/') : String(raw || '');
  const url = API_BASE + '/api/' + path;

  try {
    const headers = { 'content-type': 'application/json' };
    if (req.headers.authorization) headers.authorization = req.headers.authorization;
    if (req.headers['x-appdeploy-keys-prefix']) {
      headers['x-appdeploy-keys-prefix'] = req.headers['x-appdeploy-keys-prefix'];
    }

    const upstream = await fetch(url, {
      method: req.method,
      headers,
      body: ['GET', 'HEAD'].includes(req.method || 'GET')
        ? undefined
        : JSON.stringify(req.body ?? {}),
      redirect: 'manual',
    });

    const body = await upstream.arrayBuffer();
    res.status(upstream.status);

    const contentType = upstream.headers.get('content-type');
    if (contentType) res.setHeader('content-type', contentType);

    const location = upstream.headers.get('location');
    if (location && upstream.status >= 300 && upstream.status < 400) {
      res.setHeader('location', location);
    }

    res.send(Buffer.from(body));
  } catch (error) {
    console.error('Meta API proxy failed', error);
    res.status(502).json({ ok: false, error: 'Meta backend is temporarily unavailable.' });
  }
}
