import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import session from 'express-session';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import dotenv from 'dotenv';
dotenv.config();

import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import inventoryRoutes from './routes/inventories.js';
import likesRoutes from './routes/likes.js';
import tagsRoutes from './routes/tags.js';
import searchRoutes from './routes/search.js';
import adminUsersRoutes from './routes/adminUsers.js';

import { adminClient } from './models/supabaseClient.js';
import { upsertFromGoogle, findById } from './services/userService.js';
import debugRoutes from './routes/debug.js';
const app = express();
app.use('/api/v1/debug', debugRoutes);
app.use(helmet());
app.use(express.json({ limit: '1mb' }));
app.use(cors({ origin: true, credentials: true }));

class SupabaseSessionStore extends session.Store {
  constructor({ client, table = 'sessions', cleanupIntervalMs = 1000 * 60 * 10 } = {}) {
    super();
    if (!client) throw new Error('Supabase client required');
    this.client = client;
    this.table = table;
    this._cleanupInterval = setInterval(() => this._cleanupExpired().catch(() => {}), cleanupIntervalMs);
    if (this._cleanupInterval.unref) this._cleanupInterval.unref();
  }

  async _cleanupExpired() {
    try {
      const now = new Date().toISOString();
      await this.client.from(this.table).delete().lt('expires', now);
    } catch (err) {
      console.error('Session cleanup failed', err.message || err);
    }
  }

  async get(sid, callback) {
    try {
      const { data, error } = await this.client.from(this.table).select('sess, expires').eq('sid', sid).limit(1).maybeSingle();
      if (error) return callback(error);
      if (!data) return callback(null, null);
      if (data.expires && new Date(data.expires) <= new Date()) {
        await this.destroy(sid, () => {});
        return callback(null, null);
      }
      return callback(null, data.sess);
    } catch (err) {
      return callback(err);
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
      if (error) return callback(error);
      return callback(null);
    } catch (err) {
      return callback(err);
    }
  }

  async destroy(sid, callback) {
    try {
      const { error } = await this.client.from(this.table).delete().eq('sid', sid);
      if (error) return callback(error);
      return callback(null);
    } catch (err) { return callback(err); }
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
      if (error) return callback(error);
      return callback(null);
    } catch (err) { return callback(err); }
  }

  close() {
    if (this._cleanupInterval) clearInterval(this._cleanupInterval);
  }
}

const IS_PROD = process.env.NODE_ENV === 'production';
const SESSION_SECRET = process.env.SESSION_SECRET || 'dev_secret';
const store = new SupabaseSessionStore({ client: adminClient });

app.use(
  session({
    store,
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: IS_PROD,
      sameSite: IS_PROD ? "none" : "lax",
      maxAge: 1000 * 60 * 60 * 24 * 7,
    },
  }),
);


// Passport Google OAuth (server-only)
passport.serializeUser((user, done) => {
  done(null, user.id);
});
passport.deserializeUser(async (id, done) => {
  try {
    const user = await findById(id);
    done(null, user || null);
  } catch (err) { done(err, null); }
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
    done(null, user);
  } catch (err) { done(err, null); }
}));

app.use(passport.initialize());
app.use(passport.session());

// Mount routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/inventories', inventoryRoutes);
app.use('/api/v1/likes', likesRoutes);
app.use('/api/v1/tags', tagsRoutes);
app.use('/api/v1/search', searchRoutes);
app.use('/api/v1/admin', adminUsersRoutes);

app.get('/health', (req, res) => res.json({ status: 'ok' }));

export default app;
