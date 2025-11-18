import express from 'express';
import passport from 'passport';
import { googleCallbackResponse, logout } from '../controllers/authController.js';
const router = express.Router();

router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email'],
  accessType: 'offline',
  prompt: 'consent'
}));

router.get('/google/callback', (req, res, next) => {
  passport.authenticate('google', { session: false }, (err, user, info) => {
    if (err) {
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/error?code=oauth_error`);
    }
    if (!user) {
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/error?code=no_user`);
    }
    req.logIn(user, { session: true }, (loginErr) => {
      if (loginErr) {
        return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/error?code=login_failed`);
      }
      return googleCallbackResponse(req, res);
    });
  })(req, res, next);
});

router.get('/session', (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'unauthenticated' });
  const safe = { id: req.user.id, name: req.user.name, email: req.user.email, role: req.user.role, blocked: req.user.blocked };
  res.json({ user: safe });
});


router.post('/logout', logout);

router.get('/failure', (req, res) => res.status(401).json({ error: 'oauth_failure' }));

export default router;
