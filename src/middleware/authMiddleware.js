export function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated && req.isAuthenticated()) {
    if (req.user && req.user.blocked) {
      return res.status(403).json({ error: 'user_blocked' });
    }
    return next();
  }
  return res.status(401).json({ error: 'unauthenticated' });
}