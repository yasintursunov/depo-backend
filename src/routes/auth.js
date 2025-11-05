import express from 'express';
import passport from 'passport';
import { googleCallbackResponse, logout } from '../controllers/authController.js';

const router = express.Router();


router.get('/google', (req, res, next) => {
  
  if (req.query.next) {
    try { req.session.oauth2return = String(req.query.next); } catch (e) { /* ignore */ }
  }
  
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    accessType: 'offline',
    prompt: 'consent'
  })(req, res, next);
});


router.get(
  '/google/callback',
  passport.authenticate('google', { session: true, failureRedirect: process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/?auth=failed` : '/?auth=failed' }),
  googleCallbackResponse
);

router.post('/logout', logout);

export default router;
