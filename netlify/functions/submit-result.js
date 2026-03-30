// netlify/functions/submit-result.js
// Final submission handler: validates consent + gender, builds the per-athlete
// JSON conforming to Phase 28 schema, commits it to GitHub via Contents API,
// triggers a Netlify rebuild, and returns an HTML success confirmation page.
//
// Uses v1 handler syntax (exports.handler) — NOT v2 export default.
// Reason: Active Netlify Functions v2 env var bug confirmed 2026-03-28 where
// user-defined process.env vars return undefined intermittently. v1 is stable.
//
// Required environment variables (set in Netlify dashboard, NOT netlify.toml):
//   GITHUB_TOKEN       — Fine-grained PAT with Contents: Read and Write on this repo
//   GITHUB_OWNER       — GitHub username (e.g. Sheppardjm)
//   GITHUB_REPO        — Repository name (e.g. mkUltraGravel)
//   NETLIFY_BUILD_HOOK — Build hook URL from Netlify dashboard

const VALID_GENDERS = new Set(['M', 'F', 'NB']);

const GITHUB_API_VERSION = '2022-11-28';

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

/** Return the HTML success page shown after successful result commit. */
function successPage(name, gender) {
  const categoryLabel = gender === 'M' ? 'Men' : gender === 'F' ? 'Women' : 'Non-binary';
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
    body: `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Results Submitted — MK Ultra Gravel</title>
  <style>
    body { background: #0d0d0f; color: #e8e4d9; font-family: monospace; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
    .card { max-width: 540px; padding: 2rem; border: 1px solid #2a2a2e; border-radius: 0.5rem; background: #17171b; }
    h1 { font-size: 1.25rem; color: oklch(0.72 0.19 55); margin-bottom: 1rem; }
    .athlete { font-size: 1.1rem; color: #f5f0e8; margin-bottom: 0.5rem; }
    .category { font-size: 0.85rem; color: #9a9490; margin-bottom: 1.5rem; }
    p { color: #9a9490; line-height: 1.6; margin-bottom: 1.5rem; }
    .links { display: flex; gap: 1.5rem; flex-wrap: wrap; }
    a { color: oklch(0.72 0.19 55); text-decoration: none; font-size: 0.875rem; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Results Submitted!</h1>
    <p class="athlete">${name}</p>
    <p class="category">${categoryLabel}</p>
    <p>
      Your segment times have been submitted. The site will rebuild shortly with updated results.
    </p>
    <div class="links">
      <a href="/">← Home</a>
      <a href="/submit">Submit another activity</a>
    </div>
  </div>
</body>
</html>`,
  };
}

exports.handler = async (event) => {
  // Only accept POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  // 1. Parse form data (application/x-www-form-urlencoded)
  let formData;
  try {
    formData = new URLSearchParams(event.body || '');
  } catch {
    return errorPage('Could not parse form data. Please try again.');
  }

  const rawData = formData.get('data');
  const gender = formData.get('gender');
  const consent = formData.get('consent');

  // 2. Validate consent
  if (consent !== 'yes') {
    return errorPage('Consent is required. Please go back and check the consent box.');
  }

  // 3. Validate gender
  if (!gender || !VALID_GENDERS.has(gender)) {
    return errorPage('Invalid gender category. Please go back and select a valid category (M, F, or NB).');
  }

  // 4. Decode and validate the result payload
  if (!rawData) {
    return errorPage('Missing submission data. Please start the submission process again.');
  }

  let decoded;
  try {
    decoded = JSON.parse(Buffer.from(rawData, 'base64url').toString('utf8'));
  } catch {
    return errorPage('Invalid submission data. Please start the submission process again.');
  }

  if (
    !decoded.athleteId ||
    !decoded.name ||
    !decoded.activityUrl ||
    !decoded.segments
  ) {
    return errorPage('Incomplete submission data. Please start the submission process again.');
  }

  // 5. Build the athlete result object conforming to Phase 28 schema
  // Note: additionalProperties: false means only these 6 fields are allowed
  const resultObj = {
    athleteId: decoded.athleteId,
    name: decoded.name,
    gender,                             // from form, NOT from Strava profile
    activityUrl: decoded.activityUrl,
    submittedAt: new Date().toISOString(),
    segments: decoded.segments,         // already keyed by string segment ID
  };

  // 6. Commit to GitHub via Contents API (GET-then-PUT pattern)
  const {
    GITHUB_TOKEN,
    GITHUB_OWNER,
    GITHUB_REPO,
    NETLIFY_BUILD_HOOK,
  } = process.env;

  if (!GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO) {
    console.error('Missing required GitHub environment variables');
    return errorPage('Server configuration error. Please contact the race organizer.', 500);
  }

  const filePath = `public/data/results/athletes/${decoded.athleteId}.json`;
  const apiBase = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${filePath}`;

  const githubHeaders = {
    Authorization: `Bearer ${GITHUB_TOKEN}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': GITHUB_API_VERSION,
    'Content-Type': 'application/json',
    'User-Agent': 'MK-Ultra-Gravel-Bot/1.0',
  };

  // GET existing file to retrieve SHA (needed for updates, not for new files)
  let existingSha;
  try {
    const getRes = await fetch(apiBase, { headers: githubHeaders });
    if (getRes.ok) {
      const existing = await getRes.json();
      existingSha = existing.sha;
    } else if (getRes.status !== 404) {
      const errText = await getRes.text();
      console.error('GitHub GET error:', getRes.status, errText);
      return errorPage('Failed to check existing results. Please try again.', 500);
    }
    // 404 means first submission — no SHA needed
  } catch (err) {
    console.error('GitHub GET fetch error:', err);
    return errorPage('Failed to connect to GitHub. Please try again.', 500);
  }

  // PUT the file (create or update)
  // The content field must be standard base64, NOT base64url
  const fileContent = Buffer.from(JSON.stringify(resultObj, null, 2) + '\n').toString('base64');
  const commitMessage = `result: ${decoded.name} (${gender})`;

  const putBody = {
    message: commitMessage,
    content: fileContent,
    committer: {
      name: 'MK Ultra Gravel Bot',
      email: 'bot@mkultragravel.netlify.app',
    },
  };

  // Include SHA for updates to an existing file
  if (existingSha) {
    putBody.sha = existingSha;
  }

  let putRes;
  try {
    putRes = await fetch(apiBase, {
      method: 'PUT',
      headers: githubHeaders,
      body: JSON.stringify(putBody),
    });
  } catch (err) {
    console.error('GitHub PUT fetch error:', err);
    return errorPage('Failed to connect to GitHub. Please try again.', 500);
  }

  if (putRes.status === 409) {
    // Race condition: file was modified between our GET and PUT
    return {
      statusCode: 409,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
      body: `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Conflict — MK Ultra Gravel</title>
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
    <h1>Submission Conflict</h1>
    <p>There was a conflict saving your results. Please try submitting again.</p>
    <a href="/submit">← Try Again</a>
  </div>
</body>
</html>`,
    };
  }

  if (!putRes.ok) {
    const errText = await putRes.text();
    console.error('GitHub PUT error:', putRes.status, errText);
    return errorPage(`Failed to save results (GitHub API returned ${putRes.status}). Please try again.`, 500);
  }

  // 7. Trigger Netlify rebuild (fire-and-forget — don't fail submission if this errors)
  if (NETLIFY_BUILD_HOOK) {
    fetch(NETLIFY_BUILD_HOOK, { method: 'POST', body: '{}' }).catch((err) => {
      console.warn('Netlify build hook trigger failed (non-fatal):', err);
    });
  } else {
    console.warn('NETLIFY_BUILD_HOOK is not set — skipping rebuild trigger');
  }

  // 8. Return success confirmation page
  return successPage(decoded.name, gender);
};
