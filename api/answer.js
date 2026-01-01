const { fetchAnswerFromSupabase } = require('../lib/answers');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json; charset=UTF-8');
    res.end(JSON.stringify({ error: 'Method Not Allowed' }));
    return;
  }

  const base = `http://${req.headers.host || 'localhost'}`;
  const u = new URL(req.url, base);

  const idx = u.searchParams.get('idx');
  const topic = u.searchParams.get('topic');
  const lang = u.searchParams.get('lang') || 'ro';

  const supabaseUrl = process.env.SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

  try {
    const message = await fetchAnswerFromSupabase({
      supabaseUrl,
      supabaseKey,
      idx,
      topic,
      lang,
    });

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json; charset=UTF-8');
    res.setHeader('Cache-Control', 'no-store');
    res.end(JSON.stringify({ message }));
  } catch (err) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json; charset=UTF-8');
    res.setHeader('Cache-Control', 'no-store');
    res.end(JSON.stringify({ error: 'Bad Request' }));
  }
};

