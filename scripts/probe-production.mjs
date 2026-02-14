#!/usr/bin/env node
/**
 * Post-deploy production probe (Release Gate B)
 *
 * Runs scripted probes for /login and asset URLs to detect 307 loops or chunk 404s.
 * Exit 0 = pass, 1 = fail (blocks promotion).
 *
 * Usage: APP_URL=https://renoz-os.vercel.app node scripts/probe-production.mjs
 * Or: npm run deploy:probe
 */

const APP_URL =
  process.env.APP_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
  'https://renoz-os.vercel.app';

const PROBE_COUNT = 20;
const MAX_REDIRECTS = 5;

async function fetchWithRedirectLimit(url, options = {}) {
  const seen = new Set();
  let res = null;
  let current = url;
  let redirectCount = 0;

  while (redirectCount < MAX_REDIRECTS) {
    const r = await fetch(current, {
      redirect: 'manual',
      ...options,
    });
    res = r;

    if (r.status >= 300 && r.status < 400) {
      const loc = r.headers.get('location');
      if (!loc) break;
      const next = new URL(loc, current).href;
      if (seen.has(next)) {
        console.error(`[FAIL] Redirect loop detected: ${next}`);
        return { ok: false, status: r.status, loop: true };
      }
      seen.add(next);
      current = next;
      redirectCount++;
      continue;
    }
    break;
  }

  return {
    ok: res.status >= 200 && res.status < 300,
    status: res?.status ?? 0,
    loop: redirectCount >= MAX_REDIRECTS,
  };
}

async function probeLogin() {
  let pass = 0;
  let fail = 0;

  for (let i = 0; i < PROBE_COUNT; i++) {
    const { ok, status, loop } = await fetchWithRedirectLimit(`${APP_URL}/login`);
    if (ok && !loop) {
      pass++;
    } else {
      fail++;
      if (i < 3) console.error(`[FAIL] /login probe ${i + 1}: status=${status} loop=${loop}`);
    }
    await new Promise((r) => setTimeout(r, 150));
  }

  return { pass, fail };
}

async function probeAssetUrls(html) {
  const scriptRe = /<script[^>]+src=["']([^"']+)["']/g;
  const linkRe = /<link[^>]+href=["']([^"']+\.(?:js|css))["']/g;
  const urls = new Set();
  let m;
  while ((m = scriptRe.exec(html)) !== null) urls.add(m[1]);
  while ((m = linkRe.exec(html)) !== null) urls.add(m[1]);

  const absolute = [...urls].filter((u) => u.startsWith('/'));
  let ok = 0;
  let fail = 0;

  for (const path of absolute.slice(0, 5)) {
    const url = path.startsWith('http') ? path : `${APP_URL}${path}`;
    const r = await fetch(url, { method: 'HEAD' });
    if (r.ok) ok++;
    else {
      fail++;
      console.error(`[FAIL] Asset 404: ${path}`);
    }
  }

  return { ok, fail, total: absolute.length };
}

async function main() {
  console.log(`Probing ${APP_URL} (${PROBE_COUNT} login requests)...`);

  const loginResult = await probeLogin();
  console.log(`Login: ${loginResult.pass}/${PROBE_COUNT} passed`);

  if (loginResult.fail > 0) {
    console.error(`[FAIL] Release Gate B: ${loginResult.fail} login probes failed (possible 307 loop)`);
    process.exit(1);
  }

  const htmlRes = await fetch(`${APP_URL}/login`, { redirect: 'follow' });
  const html = await htmlRes.text();
  const assetResult = await probeAssetUrls(html);

  if (assetResult.fail > 0) {
    console.error(`[FAIL] Release Gate B: ${assetResult.fail} asset URLs returned 404`);
    process.exit(1);
  }

  console.log(`Assets: ${assetResult.ok} sampled URLs OK`);
  console.log('[PASS] Release Gate B');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
