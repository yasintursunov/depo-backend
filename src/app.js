import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import session from 'express-session';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import dotenv from 'dotenv';
import util from 'util';
dotenv.config();

import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import inventoryRoutes from './routes/inventories.js';
import likesRoutes from './routes/likes.js';
import tagsRoutes from './routes/tags.js';
import searchRoutes from './routes/search.js';
import adminUsersRoutes from './routes/adminUsers.js';
import debugRoutes from './routes/debug.js';

import { adminClient } from './models/supabaseClient.js';
import { upsertFromGoogle, findById } from './services/userService.js';

const app = express();

const IS_PROD = process.env.NODE_ENV === 'production';
const FRONTEND_URL = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');

if (IS_PROD) {
  app.use(helmet());
} else {
  app.use(helmet({ contentSecurityPolicy: false }));
}

app.use(cors({ origin: FRONTEND_URL, credentials: true }));
app.use(express.json({ limit: '1mb' }));

class SupabaseSessionStore extends session.Store {
  constructor({ client, table = 'sessions', cleanupIntervalMs = 1000 * 60 * 10 } = {}) {
    super();
    if (!client) throw new Error('Supabase client required');
    this.client = client;
    this.table = table;
    this._fallback = new Map();
    this._cleanupInterval = setInterval(() => this._cleanupExpired().catch(() => {}), cleanupIntervalMs);
    if (this._cleanupInterval.unref) this._cleanupInterval.unref();
  }

  async _cleanupExpired() {
    try {
      const now = new Date().toISOString();
      await this.client.from(this.table).delete().lt('expires', now);
    } catch (err) {
      console.error('Session cleanup failed', err && err.message ? err.message : err);
      // fallback cleanup
      const nowTs = Date.now();
      for (const [sid, value] of this._fallback.entries()) {
        if (value.expires && value.expires <= nowTs) this._fallback.delete(sid);
      }
    }
  }

  async get(sid, callback) {
    try {
      const { data, error } = await this.client.from(this.table).select('sess, expires').eq('sid', sid).limit(1).maybeSingle();
      if (error) {
        if (error.code === 'PGRST205' || (error.message && error.message.includes("Could not find the table"))) {
          const fb = this._fallback.get(sid);
          if (!fb) return callback(null, null);
          if (fb.expires && new Date(fb.expires) <= new Date()) {
            this._fallback.delete(sid);
            return callback(null, null);
          }
          return callback(null, fb.sess);
        }
        return callback(error);
      }
      if (!data) return callback(null, null);
      if (data.expires && new Date(data.expires) <= new Date()) {
        await this.destroy(sid, () => {});
        return callback(null, null);
      }
      return callback(null, data.sess);
    } catch (err) {
      console.error('Session store get error', err && err.message ? err.message : err);
      const fb = this._fallback.get(sid);
      return callback(null, fb ? fb.sess : null);
    }
  }

  async set(sid, sess, callback) {
    try {
      let expires = null;
      try {
        if (sess && sess.cookie) {
          if (sess.cookie.expires) expires = new Date(sess.cookie.expires).toISOString();
          else if (sess.cookie.maxAge) expires = new Date(Date.now() + Number(sess.cookie.maxAge)).toISOString();
        }
      } catch (e) {}
      const payload = { sid, sess, expires };
      const { error } = await this.client.from(this.table).upsert(payload, { onConflict: 'sid' });
      if (error) {
        if (error.code === 'PGRST205' || (error.message && error.message.includes("Could not find the table"))) {
          this._fallback.set(sid, { sess, expires: expires ? Date.parse(expires) : null });
          return callback(null);
        }
        return callback(error);
      }
      return callback(null);
    } catch (err) {
      console.error('Session store set error', err && err.message ? err.message : err);
      this._fallback.set(sid, { sess, expires: null });
      return callback(null);
    }
  }

  async destroy(sid, callback) {
    try {
      const { error } = await this.client.from(this.table).delete().eq('sid', sid);
      if (error) {
        if (error.code === 'PGRST205' || (error.message && error.message.includes("Could not find the table"))) {
          this._fallback.delete(sid);
          return callback(null);
        }
        return callback(error);
      }
      return callback(null);
    } catch (err) {
      console.error('Session store destroy error', err && err.message ? err.message : err);
      this._fallback.delete(sid);
      return callback(null);
    }
  }

  async touch(sid, sess, callback) {
    try {
      let expires = null;
      try {
        if (sess && sess.cookie) {
          if (sess.cookie.expires) expires = new Date(sess.cookie.expires).toISOString();
          else if (sess.cookie.maxAge) expires = new Date(Date.now() + Number(sess.cookie.maxAge)).toISOString();
        }
      } catch (e) {}
      if (expires === null) return callback(null);
      const { error } = await this.client.from(this.table).update({ expires }).eq('sid', sid);
      if (error) {
        if (error.code === 'PGRST205' || (error.message && error.message.includes("Could not find the table"))) {
          const fb = this._fallback.get(sid);
          if (fb) fb.expires = Date.parse(expires);
          return callback(null);
        }
        return callback(error);
      }
      return callback(null);
    } catch (err) {
      console.error('Session store touch error', err && err.message ? err.message : err);
      const fb = this._fallback.get(sid);
      if (fb) fb.expires = null;
      return callback(null);
    }
  }

  close() {
    if (this._cleanupInterval) clearInterval(this._cleanupInterval);
  }
}

const SESSION_SECRET = process.env.SESSION_SECRET || 'dev_secret';
const store = new SupabaseSessionStore({ client: adminClient });

app.set('trust proxy', !!process.env.TRUST_PROXY);

app.use(session({
  store,
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: IS_PROD,
    sameSite: IS_PROD ? 'none' : 'lax',
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 * 7
  }
}));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await findById(id);
    done(null, user || null);
  } catch (err) {
    done(err, null);
  }
});

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const googleId = profile.id;
    const name = profile.displayName || null;
    const email = (profile.emails && profile.emails[0] && profile.emails[0].value) || null;
    const user = await upsertFromGoogle({ googleId, name, email, accessToken, refreshToken });
    if (user) {
      user.access_token = accessToken || null;
      user.refresh_token = refreshToken || null;
    }
    return done(null, user);
  } catch (err) {
    return done(err, null);
  }
}));

app.use(passport.initialize());
app.use(passport.session());

app.use('/api/v1/debug', debugRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/inventories', inventoryRoutes);
app.use('/api/v1/likes', likesRoutes);
app.use('/api/v1/tags', tagsRoutes);
app.use('/api/v1/search', searchRoutes);
app.use('/api/v1/admin', adminUsersRoutes);

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use((err, req, res, next) => {
  try {
    console.error('Unhandled Error:', util.inspect(err, { depth: 6 }));
    if (err && err.stack) console.error(err.stack);
  } catch (e) {
    console.error('Error logging failed', e);
  }
  const status = (err && err.status) ? err.status : 500;
  const isHtml = req.accepts('html') && !req.is('json');
  if (process.env.NODE_ENV !== 'production') {
    if (isHtml) {
      res.status(status).set('Content-Type', 'text/html; charset=utf-8').send(`<html><body><h2>Server Error</h2><pre>${util.inspect(err, { depth: 6 })}</pre></body></html>`);
    } else {
      res.status(status).json({ error: (err && err.message) || String(err), details: util.inspect(err, { depth: 6 }) });
    }
  } else {
    if (isHtml) {
      if (!res.headersSent) res.status(status).send('<html><body><h2>Server Error</h2></body></html>');
    } else {
      if (!res.headersSent) res.status(status).json({ error: 'server_error' });
    }
  }
});

export default app;
