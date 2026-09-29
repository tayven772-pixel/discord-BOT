const ORIGIN = 'https://codepath-j9fln5.v2.appdeploy.ai';

export default async function handler(req, res) {
  const raw = req.query.path;
  const path = Array.isArray(raw) ? raw.join('/') : String(raw || '');
  const url = ORIGIN + '/api/' + path;
  try {
    const upstream = await fetch(url, {
      method: req.method,
      headers: { 'content-type': 'application/json' },
      body: ['GET','HEAD'].includes(req.method || 'GET') ? undefined : JSON.stringify(req.body ?? {}),
      redirect: 'manual',
    });
    if (upstream.status >= 300 && upstream.status < 400) {
      const loc = upstream.headers.get('location');
      if (loc) return res.redirect(upstream.status, loc);
    }
    const body = await upstream.arrayBuffer();
    res.status(upstream.status);
    const ct = upstream.headers.get('content-type');
    if (ct) res.setHeader('content-type', ct);
    res.send(Buffer.from(body));
  } catch {
    res.status(502).json({ ok: false, error: 'Meta backend is temporarily unavailable.' });
  }
}
