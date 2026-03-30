// netlify/functions/strava-auth.js
// Strava OAuth initiation: validates activity URL, generates CSRF nonce,
// encodes state as base64url JSON, sets HttpOnly cookie, redirects to Strava.
//
// Uses v1 handler syntax (exports.handler) — NOT v2 export default.
// Reason: Active Netlify Functions v2 env var bug confirmed 2026-03-28 where
// user-defined process.env vars return undefined intermittently. v1 is stable.
//
// Source: https://developers.strava.com/docs/authentication/

exports.handler = async (event) => {
  const { activityUrl } = event.queryStringParameters || {};

  // Validate that an activityUrl was provided and matches the expected format
  if (!activityUrl || !/strava\.com\/activities\/\d+/.test(activityUrl)) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'text/plain' },
      body: 'Invalid or missing activityUrl. Must be a Strava activity URL (e.g. https://www.strava.com/activities/12345678)',
    };
  }

  // Generate a 16-byte hex CSRF nonce
  const nonce = require('crypto').randomBytes(16).toString('hex');

  // Encode both nonce and activityUrl in the OAuth state parameter so they
  // survive the OAuth round-trip without server-side storage.
  // The nonce is also stored in the cookie for CSRF verification on callback.
  const statePayload = JSON.stringify({ nonce, activityUrl });
  const state = Buffer.from(statePayload).toString('base64url');

  // Build Strava authorization URL
  // scope: 'activity:read_all' is required (not just activity:read) to use
  // include_all_efforts=true and to access private activity segment efforts.
  const params = new URLSearchParams({
    client_id: process.env.STRAVA_CLIENT_ID,
    redirect_uri: process.env.STRAVA_REDIRECT_URI,
    response_type: 'code',
    approval_prompt: 'auto',
    scope: 'activity:read_all',
    state,
  });

  const stravaAuthUrl = `https://www.strava.com/oauth/authorize?${params}`;

  return {
    statusCode: 302,
    headers: {
      Location: stravaAuthUrl,
      // Cookie stores only the nonce (not the full state) for CSRF verification.
      // HttpOnly: not accessible to JS. Secure: HTTPS only. SameSite=Lax: sent
      // on top-level GET navigations (OAuth callback) but not on cross-site sub-requests.
      // Max-Age=600: 10-minute window for the OAuth round-trip.
      'Set-Cookie': `strava_oauth_state=${nonce}; HttpOnly; Secure; SameSite=Lax; Max-Age=600; Path=/`,
    },
    body: '',
  };
};
