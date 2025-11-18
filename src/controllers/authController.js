import * as userService from '../services/userService.js';
import { revokeGoogleToken } from '../utils/googleUtils.js';
const FRONTEND_URL = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
const FRONTEND_CALLBACK = process.env.FRONTEND_CALLBACK_URL || `${FRONTEND_URL}/auth/callback`;

export async function googleCallbackResponse(req, res) {
  try {
    if (!req.user) return res.redirect(`${FRONTEND_URL}/auth/error?code=auth_failed`);
    try {
      const tokenPatch = {};
      if (req.user.access_token) tokenPatch.access_token = req.user.access_token;
      if (req.user.refresh_token) tokenPatch.refresh_token = req.user.refresh_token;
      if (Object.keys(tokenPatch).length > 0) {
        await userService.updateUser(req.user.id, tokenPatch).catch(() => {});
      }
    } catch (e) {}
    const safeUser = {
      id: req.user.id,
      google_id: req.user.google_id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      blocked: req.user.blocked,
      created_at: req.user.created_at
    };
    const tokens = { access_token: req.user.access_token || null, refresh_token: req.user.refresh_token || null };
    const payload = { user: safeUser, tokens };
    const serialized = JSON.stringify(payload);
    const html = `<!doctype html><html><head><meta charset="utf-8"></head><body><script>(function(){try{var payload=${serialized};if(window.opener&& !window.opener.closed){window.opener.postMessage({type:'oauth',payload:payload},'*');setTimeout(function(){window.close();},300);}else{window.location.replace('${FRONTEND_CALLBACK}');}}catch(e){window.location.replace('${FRONTEND_CALLBACK}');}})();</script><div>Signing in…</div></body></html>`;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(html);
  } catch (err) {
    return res.redirect(`${FRONTEND_URL}/auth/error?code=server_error`);
  }
}

export async function logout(req, res) {
  try {
    if (req.user) {
      const token = req.user.access_token;
      if (token) {
        try { await revokeGoogleToken(token); } catch (e) {}
      }
      try { await userService.updateUser(req.user.id, { access_token: null, refresh_token: null }); } catch (e) {}
      req.logout((err) => {
        if (err) return res.redirect(`${FRONTEND_URL}/auth/error?code=logout_failed`);
        req.session?.destroy((destroyErr) => {
          if (destroyErr) return res.redirect(`${FRONTEND_URL}/auth/error?code=session_destroy_failed`);
          res.clearCookie('connect.sid');
          return res.redirect(FRONTEND_URL);
        });
      });
    } else {
      return res.redirect(FRONTEND_URL);
    }
  } catch (err) {
    return res.redirect(`${FRONTEND_URL}/auth/error?code=logout_failed`);
  }
}
