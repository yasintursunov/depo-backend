import fetch from 'node-fetch';

export async function revokeGoogleToken(token) {
  if (!token) return false;
  const url = `https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`;
  const resp = await fetch(url, { method: 'POST', headers: { 'Content-type': 'application/x-www-form-urlencoded' }});
  return resp.ok;
}