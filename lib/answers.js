const https = require('https');

function getColumn(topic, lang) {
  const safeLang = lang === 'en' ? 'en' : 'ro';
  const suffix = safeLang === 'en' ? '_en' : '_ro';

  if (topic === 'dragoste') return `love${suffix}`;
  if (topic === 'bani') return `money${suffix}`;
  if (topic === 'ghidare') return `daily_vibration${suffix}`;

  return '';
}

function getJson(url, headers) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request(
      {
        protocol: u.protocol,
        hostname: u.hostname,
        port: u.port || 443,
        method: 'GET',
        path: `${u.pathname}${u.search}`,
        headers,
      },
      (res) => {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          const status = Number(res.statusCode) || 0;
          if (status < 200 || status >= 300) {
            reject(new Error(`HTTP ${status}`));
            return;
          }
          try {
            resolve(JSON.parse(body));
          } catch (err) {
            reject(err);
          }
        });
      },
    );

    req.on('error', reject);
    req.end();
  });
}

async function fetchAnswerFromSupabase({ supabaseUrl, supabaseKey, idx, topic, lang }) {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase credentials');
  }

  const column = getColumn(topic, lang);
  if (!column) {
    throw new Error('Unknown topic');
  }

  const safeIdx = Number.parseInt(String(idx), 10);
  if (!Number.isFinite(safeIdx) || safeIdx <= 0) {
    throw new Error('Invalid idx');
  }

  const url = `${supabaseUrl.replace(/\/+$/, '')}/rest/v1/answers?idx=eq.${encodeURIComponent(
    String(safeIdx),
  )}&select=${encodeURIComponent(column)}`;

  const rows = await getJson(url, {
    apikey: supabaseKey,
    Authorization: `Bearer ${supabaseKey}`,
    Accept: 'application/json',
  });

  const first = Array.isArray(rows) ? rows[0] : null;
  const value = first ? first[column] : null;
  return typeof value === 'string' ? value : '';
}

module.exports = {
  fetchAnswerFromSupabase,
  getColumn,
};

