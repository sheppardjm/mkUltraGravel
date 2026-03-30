// netlify/functions/strava-callback.js
// Strava OAuth callback: verifies CSRF state, exchanges code for access token,
// fetches the activity with all segment efforts, filters to the 9 event segments,
// rejects activities with zero matches, redirects to /submit-confirm with result data.
//
// Uses v1 handler syntax (exports.handler) — NOT v2 export default.
// Reason: Active Netlify Functions v2 env var bug confirmed 2026-03-28 where
// user-defined process.env vars return undefined intermittently. v1 is stable.
//
// Source: https://developers.strava.com/docs/authentication/
//         https://developers.strava.com/docs/reference/#api-Activities-getActivityById

// The 9 official MK Ultra Gravel event segment IDs (as strings).
// Strava returns segment.id as a number; always cast with String() before comparing.
const ALL_SEGMENT_IDS = new Set([
  '24479270',
  '24479292',
  '41126651',
  '24479426',
  '24479467',
  '24479496',
  '34573011',
  '16438243',
  '6809754',
]);

/**
 * Parse cookies from the Cookie header string into a plain object.
 * Handles quoted values and whitespace around names and values.
 */
function parseCookies(cookieHeader) {
  const cookies = {};
  if (!cookieHeader) return cookies;
  cookieHeader.split(';').forEach((pair) => {
    const idx = pair.indexOf('=');
    if (idx === -1) return;
    const name = pair.slice(0, idx).trim();
    const value = pair.slice(idx + 1).trim();
    cookies[name] = value;
  });
  return cookies;
}

/** Return a user-friendly HTML error page with a link back to /submit. */
function errorPage(message, statusCode = 400) {
  return {
    statusCode,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
    body: `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Submission Error — MK Ultra Gravel</title>
  <style>
    body { background: #0d0d0f; color: #e8e4d9; font-family: monospace; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
    .card { max-width: 540px; padding: 2rem; border: 1px solid #2a2a2e; border-radius: 0.5rem; background: #17171b; }
    h1 { font-size: 1.25rem; color: #f5f0e8; margin-bottom: 1rem; }
    p { color: #9a9490; line-height: 1.6; margin-bottom: 1.5rem; }
    a { color: oklch(0.72 0.19 55); text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Submission Error</h1>
    <p>${message}</p>
    <a href="/submit">← Back to Submit</a>
  </div>
</body>
</html>`,
  };
}

exports.handler = async (event) => {
  const params = event.queryStringParameters || {};

  // 1. Handle access denied (user clicked "Cancel" on Strava OAuth page)
  if (params.error === 'access_denied') {
    return {
      statusCode: 302,
      headers: { Location: '/submit?submit=denied' },
      body: '',
    };
  }

  // 2. Verify CSRF state nonce
  const { state, code } = params;

  if (!state) {
    return errorPage('Invalid or missing state parameter. Please start the submission process again.');
  }

  let decoded;
  try {
    decoded = JSON.parse(Buffer.from(state, 'base64url').toString('utf8'));
  } catch {
    return errorPage('Invalid or missing state parameter. Please start the submission process again.');
  }

  const { nonce, activityUrl } = decoded;

  if (!nonce || !activityUrl) {
    return errorPage('Invalid or missing state parameter. Please start the submission process again.');
  }

  const cookies = parseCookies(event.headers['cookie'] || event.headers['Cookie'] || '');
  const cookieNonce = cookies['strava_oauth_state'];

  if (!cookieNonce || cookieNonce !== nonce) {
    return errorPage('Invalid or missing state parameter. Please start the submission process again.');
  }

  // 3. Exchange authorization code for access token
  if (!code) {
    return errorPage('No authorization code received from Strava. Please try again.');
  }

  let tokenData;
  try {
    const tokenRes = await fetch('https://www.strava.com/api/v3/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
      }),
    });
    tokenData = await tokenRes.json();
  } catch (err) {
    return errorPage('Failed to connect to Strava. Please try again.');
  }

  if (!tokenData.access_token) {
    return errorPage('Token exchange failed. Please try the submission process again.');
  }

  // 4. Extract activity ID from activity URL
  const activityMatch = activityUrl.match(/strava\.com\/activities\/(\d+)/);
  if (!activityMatch) {
    return errorPage('Invalid activity URL. Please return to the submit page and enter a valid Strava activity URL.');
  }
  const activityId = activityMatch[1];

  // 5. Fetch activity with all segment efforts
  let activity;
  try {
    const activityRes = await fetch(
      `https://www.strava.com/api/v3/activities/${activityId}?include_all_efforts=true`,
      {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      }
    );
    if (!activityRes.ok) {
      return errorPage('Failed to fetch activity from Strava. Make sure the activity URL is correct and belongs to your account.');
    }
    activity = await activityRes.json();
  } catch (err) {
    return errorPage('Failed to fetch activity from Strava. Please try again.');
  }

  // 6. Filter segment efforts to only those matching the 9 event segments
  const efforts = Array.isArray(activity.segment_efforts) ? activity.segment_efforts : [];
  const matchingEfforts = efforts.filter((effort) =>
    ALL_SEGMENT_IDS.has(String(effort.segment.id))
  );

  if (matchingEfforts.length === 0) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
      body: `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>No Matching Segments — MK Ultra Gravel</title>
  <style>
    body { background: #0d0d0f; color: #e8e4d9; font-family: monospace; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
    .card { max-width: 600px; padding: 2rem; border: 1px solid #2a2a2e; border-radius: 0.5rem; background: #17171b; }
    h1 { font-size: 1.25rem; color: #f5f0e8; margin-bottom: 1rem; }
    p { color: #9a9490; line-height: 1.6; margin-bottom: 1rem; }
    ul { color: #9a9490; line-height: 1.8; margin-bottom: 1.5rem; padding-left: 1.5rem; }
    a { color: oklch(0.72 0.19 55); text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="card">
    <h1>No Matching Event Segments Found</h1>
    <p>
      We could not find any MK Ultra Gravel event segment efforts in the activity you submitted.
      Make sure you submitted an activity from the MK Ultra Gravel course.
    </p>
    <p>Things to check:</p>
    <ul>
      <li>The activity must be recorded on the official MK Ultra Gravel course</li>
      <li>Your activity must have GPS data and segment matching enabled on Strava</li>
      <li>You must have authorized with the Strava account that owns the activity</li>
    </ul>
    <a href="/submit">← Back to Submit</a>
  </div>
</body>
</html>`,
    };
  }

  // 7. Build result data for the confirmation page
  // Use the last effort for each segment (in case of duplicates from multiple passes)
  const segmentMap = {};
  for (const effort of matchingEfforts) {
    segmentMap[String(effort.segment.id)] = { elapsed_time: effort.elapsed_time };
  }

  const firstname = tokenData.athlete?.firstname || '';
  const lastname = tokenData.athlete?.lastname || '';

  const payload = {
    athleteId: String(tokenData.athlete.id),
    name: `${firstname} ${lastname}`.trim(),
    activityUrl,
    segments: segmentMap,
  };

  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');

  // 8. Redirect to confirmation page, clear the CSRF cookie
  return {
    statusCode: 302,
    headers: {
      Location: `/submit-confirm?data=${encodedPayload}`,
      // Clear the CSRF nonce cookie now that it has been consumed
      'Set-Cookie': 'strava_oauth_state=; HttpOnly; Secure; SameSite=Lax; Max-Age=0; Path=/',
    },
    body: '',
  };
};
