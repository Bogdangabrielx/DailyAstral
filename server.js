const http = require('http');
const fs = require('fs');
const path = require('path');
const { fetchAnswerFromSupabase } = require('./lib/answers');

const publicDir = path.join(__dirname, 'public');
const port = 3000;

function getHeaderValue(headers, name) {
  const value = headers[name];
  if (Array.isArray(value)) {
    return value[0] || '';
  }
  return typeof value === 'string' ? value : '';
}

function parseCookies(cookieHeader) {
  const cookies = {};
  if (typeof cookieHeader !== 'string' || !cookieHeader) {
    return cookies;
  }

  for (const part of cookieHeader.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (!key) continue;
    cookies[key] = decodeURIComponent(value);
  }

  return cookies;
}

function getPreferredLangFromCookies(req) {
  const cookies = parseCookies(getHeaderValue(req.headers, 'cookie'));
  const raw = cookies['horoscop.lang'] || cookies.horoscop_lang || '';
  if (raw === 'en' || raw === 'ro') {
    return raw;
  }
  return null;
}

function normalizeCountryCode(raw) {
  const code = String(raw || '').trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) {
    return null;
  }
  if (code === 'XX') {
    return null;
  }
  return code;
}

function getCountryCode(req) {
  const headers = req.headers;
  return (
    normalizeCountryCode(getHeaderValue(headers, 'cf-ipcountry')) ||
    normalizeCountryCode(getHeaderValue(headers, 'x-vercel-ip-country')) ||
    normalizeCountryCode(getHeaderValue(headers, 'cloudfront-viewer-country')) ||
    normalizeCountryCode(getHeaderValue(headers, 'x-appengine-country')) ||
    normalizeCountryCode(getHeaderValue(headers, 'x-country-code')) ||
    null
  );
}

function pickRootLang(req) {
  const preferred = getPreferredLangFromCookies(req);
  if (preferred) {
    return preferred;
  }

  const country = getCountryCode(req);
  if (country === 'RO') {
    return 'ro';
  }
  if (country) {
    return 'en';
  }

  return 'ro';
}

const mimeTypes = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'text/javascript; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

const server = http.createServer((req, res) => {
  const base = `http://${req.headers.host || `localhost:${port}`}`;
  const u = new URL(req.url, base);
  const safePath = u.pathname;

  if (safePath === '/' || safePath === '/index.html') {
    const lang = pickRootLang(req);
    res.writeHead(302, { Location: lang === 'en' ? '/en/' : '/ro/' });
    res.end();
    return;
  }

  if (safePath === '/eng' || safePath.startsWith('/eng/')) {
    const suffix = safePath.slice('/eng'.length);
    const search = u.search || '';
    res.writeHead(301, { Location: `/en${suffix}${search}` });
    res.end();
    return;
  }

  if (safePath === '/api/answer') {
    if (req.method !== 'GET') {
      res.writeHead(405, { 'Content-Type': 'application/json; charset=UTF-8' });
      res.end(JSON.stringify({ error: 'Method Not Allowed' }));
      return;
    }

    const idx = u.searchParams.get('idx');
    const topic = u.searchParams.get('topic');
    const lang = u.searchParams.get('lang') || 'ro';

    let supabaseUrl = process.env.SUPABASE_URL || '';
    let supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

    if (!supabaseUrl || !supabaseKey) {
      try {
        const configPath = path.join(publicDir, 'config.js');
        const raw = fs.readFileSync(configPath, 'utf8');
        const urlMatch = raw.match(/url\s*:\s*['"]([^'"]+)['"]/);
        const keyMatch = raw.match(/anonKey\s*:\s*['"]([^'"]+)['"]/);
        if (!supabaseUrl && urlMatch) supabaseUrl = urlMatch[1];
        if (!supabaseKey && keyMatch) supabaseKey = keyMatch[1];
      } catch {
        // ignore
      }
    }

    fetchAnswerFromSupabase({ supabaseUrl, supabaseKey, idx, topic, lang })
      .then((message) => {
        res.writeHead(200, {
          'Content-Type': 'application/json; charset=UTF-8',
          'Cache-Control': 'no-store',
        });
        res.end(JSON.stringify({ message }));
      })
      .catch(() => {
        res.writeHead(400, {
          'Content-Type': 'application/json; charset=UTF-8',
          'Cache-Control': 'no-store',
        });
        res.end(JSON.stringify({ error: 'Bad Request' }));
      });
    return;
  }

  // Keep local Supabase credentials from being served as a static asset.
  if (safePath === '/config.js') {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=UTF-8' });
    res.end('404 Not Found');
    return;
  }

  let urlPath = req.url;
  if (safePath === '/ro' || safePath === '/ro/') {
    urlPath = '/ro/index.html';
  } else if (safePath === '/en' || safePath === '/en/') {
    urlPath = '/en/index.html';
  }
  const staticPath = urlPath.split('?')[0].split('#')[0];
  const filePath = path.join(publicDir, staticPath);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=UTF-8' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || 'application/octet-stream';

    fs.readFile(filePath, (readErr, data) => {
      if (readErr) {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=UTF-8' });
        res.end('500 Internal Server Error');
        return;
      }

      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    });
  });
});

server.listen(port, () => {
  console.log(`Server pornit pe http://localhost:${port}`);
});
