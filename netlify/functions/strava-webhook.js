// netlify/functions/strava-webhook.js
// Strava webhook handler: validates subscription handshakes and processes
// deauthorization events by deleting the athlete's result file from the
// GitHub repo (Strava TOS Section 5.4 — delete personal data within 48h).
//
// Uses v1 handler syntax (exports.handler) — NOT v2 export default.
// Reason: Active Netlify Functions v2 env var bug confirmed 2026-03-28 where
// user-defined process.env vars return undefined intermittently. v1 is stable.
//
// Required environment variables (set in Netlify dashboard, NOT netlify.toml):
//   STRAVA_VERIFY_TOKEN — Secret string used to verify Strava subscription handshake
//   GITHUB_TOKEN        — Fine-grained PAT with Contents: Read and Write on this repo
//   GITHUB_OWNER        — GitHub username (e.g. Sheppardjm)
//   GITHUB_REPO         — Repository name (e.g. mkUltraGravel)
//   NETLIFY_BUILD_HOOK  — Build hook URL from Netlify dashboard (optional; skips rebuild if absent)
//
// One-time webhook subscription registration (after deploy):
//   curl -X POST https://www.strava.com/api/v3/push_subscriptions \
//     -F client_id=YOUR_CLIENT_ID \
//     -F client_secret=YOUR_CLIENT_SECRET \
//     -F callback_url=https://mkultragravel.netlify.app/.netlify/functions/strava-webhook \
//     -F verify_token=YOUR_VERIFY_TOKEN

const GITHUB_API_VERSION = '2022-11-28';

/**
 * Delete an athlete's result file from the GitHub repo.
 * Idempotent — logs and returns if the file doesn't exist.
 * Non-throwing — webhook response has already been acknowledged before this runs.
 *
 * @param {string} athleteId
 */
async function deleteAthleteData(athleteId) {
  const { GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO, NETLIFY_BUILD_HOOK } = process.env;

  if (!GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO) {
    console.error('deleteAthleteData: missing required GitHub environment variables — cannot delete athlete data');
    return;
  }

  const filePath = `public/data/results/athletes/${athleteId}.json`;
  const apiUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${filePath}`;

  const githubHeaders = {
    Authorization: `Bearer ${GITHUB_TOKEN}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': GITHUB_API_VERSION,
    'Content-Type': 'application/json',
    'User-Agent': 'MK-Ultra-Gravel-Bot/1.0',
  };

  // GET the file to retrieve its SHA (required for the DELETE call)
  let fileSha;
  try {
    const getRes = await fetch(apiUrl, { headers: githubHeaders });

    if (getRes.status === 404) {
      console.log(`deleteAthleteData: No data file found for athlete ${athleteId} — nothing to delete (idempotent)`);
      return;
    }

    if (!getRes.ok) {
      const errText = await getRes.text();
      console.error(`deleteAthleteData: GitHub GET failed (${getRes.status}): ${errText}`);
      return;
    }

    const fileData = await getRes.json();
    fileSha = fileData.sha;
  } catch (err) {
    console.error('deleteAthleteData: GitHub GET fetch error:', err);
    return;
  }

  // DELETE the file using the SHA
  try {
    const deleteRes = await fetch(apiUrl, {
      method: 'DELETE',
      headers: githubHeaders,
      body: JSON.stringify({
        message: `deauth: delete athlete ${athleteId} data per TOS 5.4`,
        sha: fileSha,
        committer: {
          name: 'MK Ultra Gravel Bot',
          email: 'bot@mkultragravel.netlify.app',
        },
      }),
    });

    if (!deleteRes.ok) {
      const errText = await deleteRes.text();
      console.error(`deleteAthleteData: GitHub DELETE failed (${deleteRes.status}): ${errText}`);
      return;
    }
  } catch (err) {
    console.error('deleteAthleteData: GitHub DELETE fetch error:', err);
    return;
  }

  console.log(`deleteAthleteData: Deleted data for athlete ${athleteId} (TOS 5.4 compliance)`);

  // Fire-and-forget rebuild trigger (same pattern as submit-result.js)
  if (NETLIFY_BUILD_HOOK) {
    fetch(NETLIFY_BUILD_HOOK, { method: 'POST', body: '{}' }).catch((err) => {
      console.warn('deleteAthleteData: Netlify build hook trigger failed (non-fatal):', err);
    });
  } else {
    console.warn('deleteAthleteData: NETLIFY_BUILD_HOOK is not set — skipping rebuild trigger');
  }
}

exports.handler = async (event) => {
  const method = event.httpMethod;

  // -------------------------------------------------------------------------
  // GET — Strava subscription validation handshake
  // Strava sends: ?hub.mode=subscribe&hub.challenge=<token>&hub.verify_token=<secret>
  // We must echo hub.challenge back if verify_token matches.
  // -------------------------------------------------------------------------
  if (method === 'GET') {
    const params = event.queryStringParameters || {};
    const mode = params['hub.mode'];
    const challenge = params['hub.challenge'];
    const verifyToken = params['hub.verify_token'];

    if (mode === 'subscribe' && verifyToken === process.env.STRAVA_VERIFY_TOKEN) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 'hub.challenge': challenge }),
      };
    }

    return { statusCode: 403, body: 'Forbidden' };
  }

  // -------------------------------------------------------------------------
  // POST — Incoming webhook event (activity create/update/delete, athlete deauth)
  // Always respond 200 immediately; Strava retries on non-2xx responses.
  // -------------------------------------------------------------------------
  if (method === 'POST') {
    let payload;
    try {
      payload = JSON.parse(event.body || '{}');
    } catch {
      // Malformed body — acknowledge so Strava doesn't retry endlessly
      return { statusCode: 200, body: 'EVENT_RECEIVED' };
    }

    // Detect deauthorization event:
    //   object_type === 'athlete', aspect_type === 'delete',
    //   updates.authorized === 'false'  (STRING, not boolean — per Strava docs)
    const isDeauth =
      payload.object_type === 'athlete' &&
      payload.aspect_type === 'delete' &&
      payload.updates?.authorized === 'false';

    if (isDeauth) {
      const athleteId = String(payload.owner_id || payload.object_id);
      // Await deletion but do not let errors bubble up — we've already decided to return 200
      await deleteAthleteData(athleteId);
    }

    // Respond 200 for ALL POST events (activity creates/updates/deletes, deauth, etc.)
    return { statusCode: 200, body: 'EVENT_RECEIVED' };
  }

  // -------------------------------------------------------------------------
  // All other methods
  // -------------------------------------------------------------------------
  return { statusCode: 405, body: 'Method Not Allowed' };
};
