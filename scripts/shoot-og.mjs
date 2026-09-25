// Re-shoot the link preview card: `npm run shoot:og`
//
// WHY THIS EXISTS
// Without an og:image, iMessage and Slack scrape the page and show whichever
// large image they find first — which was the top case study's thumbnail. A
// screenshot of a dashboard is unreadable in a chat bubble and says nothing
// about whose site it is. This draws a card instead: the name, the role, the
// domain, at a size that survives the tile.
//
// WHY IT DRAWS THE CARD IN CHROME
// The card is HTML using the site's own tokens.css and webfonts, so its
// colours and type come from the same source as the site. Change --ink or
// --accent and the card follows on the next run. Nothing here re-states a
// hex value or a typeface.
//
// WHY THE COPY IS IMPORTED
// The name and role are read from src/data/site.ts, the file the home page
// hero reads. Retyping them here would let the card drift from the site the
// first time either changes.
//
// No dependencies: Chrome is driven over the DevTools Protocol using the
// WebSocket built into Node. Nothing here is imported by the site build.

import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';

import { site, hero } from '../src/data/site.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const OUT = join(root, 'public/og.png');

// The size every scraper wants. Shot at 1x because this is the delivered
// pixel size, not a source image to be scaled down later.
const WIDTH = 1200;
const HEIGHT = 630;

// Set here rather than in the stylesheet below so the overflow check at the
// end can reason about the same numbers the card is drawn with.
const NAME_SIZE = 104;
const ROLE_SIZE = 40;

// The role shown on the card. The hero cycles through hero.roles on click;
// a still image has to pick one, and the first is the one the page loads with.
const ROLE = `${hero.roles[0]} ${hero.trail}`;
// The card shows the canonical host, read from the one place that defines it
// so it can't outlive a domain move.
const config = readFileSync(join(root, 'astro.config.mjs'), 'utf8');
const canonical = config.match(/site:\s*'([^']+)'/)?.[1];
if (!canonical) {
  console.error("Could not find `site:` in astro.config.mjs — the card needs the canonical host.");
  process.exit(1);
}
const DOMAIN = new URL(canonical).host;

const CHROME = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
].find((p) => existsSync(p));

if (!CHROME) {
  console.error('No Chrome found. Install Google Chrome, or point CHROME at a binary.');
  process.exit(1);
}

// --- The card --------------------------------------------------------------

/** Inline a woff2 from the repo so the page needs no network. */
const face = (family, file, weight) => {
  const bytes = readFileSync(join(root, file));
  return `@font-face {
      font-family: '${family}';
      font-weight: ${weight};
      font-display: block;
      src: url(data:font/woff2;base64,${bytes.toString('base64')}) format('woff2');
    }`;
};

const tokens = readFileSync(join(root, 'src/styles/tokens.css'), 'utf8');

const escape = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <style>
      ${face('Gabarito', 'node_modules/@fontsource/gabarito/files/gabarito-latin-400-normal.woff2', 400)}
      ${face('KK Topo', 'public/fonts/KK-Topo-Regular.woff2', 400)}
      ${face('Geist Mono Variable', 'node_modules/@fontsource-variable/geist-mono/files/geist-mono-latin-wght-normal.woff2', '100 900')}
      ${tokens}

      html, body { margin: 0; }
      body {
        width: ${WIDTH}px;
        height: ${HEIGHT}px;
        background: var(--paper);
        /* The tile is cropped to a rounded rect by some clients, so nothing
           load-bearing goes nearer the edge than this. */
        padding: 96px;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        justify-content: center;
        position: relative;
        -webkit-font-smoothing: antialiased;
      }
      /* The hero headline's treatment: --font-display, the same face,
         weight and tracking the home page sets its name in. Not --t-display —
         that size is fluid (clamp on vw) and a 1200px-wide card would land
         on 58px, small for a tile. The size is set here; everything else
         about the face comes from the tokens. */
      .name {
        margin: 0;
        font: 400 ${NAME_SIZE}px/1.05 var(--font-display);
        letter-spacing: var(--track-display);
        /* Lowercased here, not in the data: site.name is also the tab title
           and og:title, where it stays capitalised. */
        text-transform: lowercase;
        color: var(--ink);
      }
      .rule {
        width: 72px;
        height: 3px;
        margin: 40px 0;
        background: var(--accent);
      }
      .role {
        margin: 0;
        font: 400 ${ROLE_SIZE}px/1.25 var(--font-sans);
        letter-spacing: var(--track-section);
        color: var(--ink-soft);
      }
      .domain {
        position: absolute;
        right: 96px;
        bottom: 96px;
        font: var(--t-mono-caption);
        letter-spacing: var(--track-eyebrow);
        text-transform: uppercase;
        color: var(--ink-faint);
      }
    </style>
  </head>
  <body>
    <h1 class="name">${escape(site.name)}</h1>
    <div class="rule"></div>
    <p class="role">${escape(ROLE)}</p>
    <span class="domain">${escape(DOMAIN)}</span>
  </body>
</html>`;

// --- Chrome ----------------------------------------------------------------

const profile = mkdtempSync(join(tmpdir(), 'shoot-og-'));
const page = join(profile, 'card.html');
writeFileSync(page, html);

const chrome = spawn(CHROME, [
  '--headless=new',
  '--remote-debugging-port=0', // Chrome picks a free one and writes it out
  `--user-data-dir=${profile}`,
  '--no-first-run',
  '--no-default-browser-check',
  '--hide-scrollbars',
  '--disable-gpu',
  '--force-color-profile=srgb', // else the PNG carries a display profile and colours shift
  `--window-size=${WIDTH},${HEIGHT}`,
  'about:blank',
], { stdio: ['ignore', 'ignore', 'pipe'] });

let ws;
const cleanup = () => {
  try { ws?.close(); } catch {}
  chrome.kill();
  try { rmSync(profile, { recursive: true, force: true, maxRetries: 5 }); } catch {}
};
process.on('exit', cleanup);

// --- DevTools Protocol, the thin slice of it we need -----------------------

let nextId = 0;
const pending = new Map();
const waiters = [];

const send = (method, params = {}, sessionId) =>
  new Promise((resolve, reject) => {
    const id = ++nextId;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params, sessionId }));
  });

/** Resolve when an event named `method` arrives. */
const until = (method, timeout = 30_000) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timed out waiting for ${method}`)), timeout);
    waiters.push({ method, resolve: (p) => { clearTimeout(timer); resolve(p); } });
  });

/** Run an expression in the page and hand back its value. */
const evaluate = async (session, expression) => {
  const { result, exceptionDetails } = await send(
    'Runtime.evaluate',
    { expression, awaitPromise: true, returnByValue: true },
    session,
  );
  if (exceptionDetails) throw new Error(exceptionDetails.text ?? 'page threw');
  return result.value;
};

// --- Connect ---------------------------------------------------------------

const portFile = join(profile, 'DevToolsActivePort');
for (let i = 0; !existsSync(portFile); i++) {
  if (i > 100) throw new Error('Chrome never reported a debugging port');
  await sleep(100);
}
const port = readFileSync(portFile, 'utf8').split('\n')[0].trim();

const { webSocketDebuggerUrl } = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();

ws = new WebSocket(webSocketDebuggerUrl);
ws.addEventListener('message', (event) => {
  const msg = JSON.parse(event.data);
  if (msg.id) {
    const p = pending.get(msg.id);
    pending.delete(msg.id);
    msg.error ? p.reject(new Error(msg.error.message)) : p.resolve(msg.result);
    return;
  }
  const i = waiters.findIndex((w) => w.method === msg.method);
  if (i !== -1) waiters.splice(i, 1)[0].resolve(msg.params);
});
await new Promise((resolve, reject) => {
  ws.addEventListener('open', resolve, { once: true });
  ws.addEventListener('error', () => reject(new Error('could not attach to Chrome')), { once: true });
});

const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });

await send('Page.enable', {}, sessionId);
await send('Runtime.enable', {}, sessionId);
await send('Emulation.setDeviceMetricsOverride', {
  width: WIDTH, height: HEIGHT, deviceScaleFactor: 1, mobile: false,
}, sessionId);

// --- Draw and shoot --------------------------------------------------------

const load = until('Page.loadEventFired');
await send('Page.navigate', { url: `file://${page}` }, sessionId);
await load;

// The fonts are inline, so this resolves immediately — but the card is all
// type, and shooting a frame early would ship it in the fallback face.
await evaluate(sessionId, 'document.fonts.ready.then(() => true)');

// A card whose name has wrapped to two lines has overflowed its padding; the
// layout would look broken and nobody would see it until it was out in a text
// thread. Cheaper to refuse than to ship.
// Measured against each element's own computed line-height rather than a
// number repeated from the stylesheet, so retuning a size can't quietly
// leave this check measuring the old one.
const overflow = await evaluate(sessionId, `(() => {
  const lines = (sel) => {
    const el = document.querySelector(sel);
    const step = parseFloat(getComputedStyle(el).lineHeight);
    return Math.round(el.getBoundingClientRect().height / step);
  };
  return { name: lines('.name'), role: lines('.role') };
})()`);

if (overflow.name > 1) {
  console.error(`"${site.name}" wraps to ${overflow.name} lines at ${NAME_SIZE}px. Lower NAME_SIZE.`);
  console.error('Nothing was written.');
  process.exit(1);
}

await evaluate(sessionId, 'new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))');

const { data } = await send('Page.captureScreenshot', {
  format: 'png',
  captureBeyondViewport: false,
  clip: { x: 0, y: 0, width: WIDTH, height: HEIGHT, scale: 1 },
}, sessionId);

mkdirSync(dirname(OUT), { recursive: true });
const bytes = Buffer.from(data, 'base64');
writeFileSync(OUT, bytes);

console.log(`✓ ${OUT.replace(`${root}/`, '')} — ${WIDTH}×${HEIGHT}, ${(bytes.length / 1024).toFixed(0)} KB`);
console.log(`  ${site.name} · ${ROLE}${overflow.role > 1 ? ` (role on ${overflow.role} lines)` : ''}`);

// The socket and the browser both hold the event loop open, so ask to leave
// rather than waiting to be let out. `exit` runs cleanup on the way.
process.exit(0);
