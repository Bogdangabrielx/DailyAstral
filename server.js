const http = require('http');
const fs = require('fs');
const path = require('path');
const { fetchAnswerFromSupabase } = require('./lib/answers');

const publicDir = path.join(__dirname, 'public');
const port = 3000;

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

  const urlPath = req.url === '/' ? '/index.html' : req.url;
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
