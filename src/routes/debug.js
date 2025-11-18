import express from 'express';
const router = express.Router();

router.get('/whoami', (req, res) => {
  try {
    const user = req.user || null;
    const session = req.session || null;
    res.json({ ok: true, user: user ? {
      id: user.id, google_id: user.google_id, name: user.name, email: user.email, role: user.role
    } : null, sessionExists: !!session });
  } catch (err) {
    res.status(500).json({ ok: false, error: (err && err.message) || 'error' });
  }
});


router.get('/fake-callback', (req, res) => {
  const payload = { user: { id: 'fake-1', name: 'Fake User' }, tokens: { access_token: 'x' } };
  const html = `<!doctype html><html><body><script>
    (function(){ var payload=${JSON.stringify(payload)}; if(window.opener && !window.opener.closed){ window.opener.postMessage({type:'oauth', payload}, '*'); setTimeout(()=>window.close(),300);} else window.location.replace('http://localhost:3000/auth/callback'); })();
  </script></body></html>`;
  res.setHeader('Content-Type','text/html');
  res.send(html);
});

router.get('/supabase', async (req, res) => {
  try {
    const r = await testConnection();
    res.json({ ok: true, result: r });
  } catch (err) {
    console.error('Debug supabase error:', err);
    res.status(500).json({ ok: false, message: err.message, details: err.original ? String(err.original) : undefined });
  }
});

export default router;
