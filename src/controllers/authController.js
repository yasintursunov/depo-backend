import * as userService from '../services/userService.js';
import { revokeGoogleToken } from '../utils/googleUtils.js';


const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

export async function googleCallbackResponse(req, res) {

  if (!req.user) {
    
    console.error('Auth callback failed: No user attached to req.');
    return res.redirect(`${FRONTEND_URL}/auth/error?code=auth_failed`);
  }

 
  console.log('Auth callback success, redirecting to FRONTEND_URL...');
  return res.redirect(FRONTEND_URL);
}

export async function logout(req, res) {
  try {
    if (req.user) {
      const token = req.user.access_token;
      if (token) {
        try { await revokeGoogleToken(token); } catch (e) { /* ignore errors */ }
      }
      await userService.updateUser(req.user.id, { access_token: null, refresh_token: null });
      
      req.logout((err) => { 
        if (err) { 
          console.error('Logout error:', err);
          return res.redirect(`${FRONTEND_URL}/auth/error?code=logout_failed`);
        }
        
        req.session.destroy((destroyErr) => {
          if (destroyErr) {
            console.error('Session destroy error:', destroyErr);
            return res.redirect(`${FRONTEND_URL}/auth/error?code=session_destroy_failed`);
          }
          
          res.clearCookie('connect.sid');
        
          return res.redirect(FRONTEND_URL);
        });
      });
    } else {
     
      return res.redirect(FRONTEND_URL);
    }
  } catch (err) {
    console.error('Logout catch error', err);
    
    return res.redirect(`${FRONTEND_URL}/auth/error?code=logout_failed`);
  }
}