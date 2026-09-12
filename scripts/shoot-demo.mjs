// Re-shoot the Baby Steps thumbnail: `npm run shoot:demo`
//
// WHY THIS EXISTS
// The home page shows one screenshot of Baby Steps. Taken by hand it is a
// different photograph every time — different window width, different scroll
// position, different month in view — so the thumbnail drifts away from the
// app it is supposed to stand for. This pins the framing: same viewport, same
// scale, same crop, every run. When Baby Steps changes, run it again.
//
// WHY IT DRIVES CHROME RATHER THAN CROPPING PIXELS
// The demo carries a "This is a demo." banner across the top. Cropping N pixels
// off the finished image would encode that banner's current height in this file
// and rot the first time it wraps to two lines. Instead we remove the banner
// element in the page and let the layout reflow, so the capture starts at the
// app's real top edge whatever the banner does.
//
// No dependencies: Chrome is driven over the DevTools Protocol using the
// WebSocket built into Node. Nothing here is imported by the site build.

import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const URL_ = process.env.SHOOT_URL ?? 'https://baby-steps.stxphanie.com/demo';
const OUT = join(root, 'src/assets/baby-steps/app-screenshot.png');

// The accordion crops this to a wide top-left band, so height past the first
// couple of calendar rows is never seen. 2x because the band is served at up to
// ~650 CSS px and the source should still be sharp on a retina screen.
const WIDTH = 1440;
const HEIGHT = 900;
const SCALE = 2;

// The banner is identified by its own copy rather than by a class name: the
// classes are Tailwind utilities that change whenever the banner is restyled,
// the sentence is the thing that has to stay for the banner to mean anything.
const BANNER_TEXT = 'This is a demo.';

const CHROME = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
].find((p) => existsSync(p));

if (!CHROME) {
  console.error('No Chrome found. Install Google Chrome, or point CHROME at a binary.');
  process.exit(1);
}

const profile = mkdtempSync(join(tmpdir(), 'shoot-demo-'));

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
  // Chrome may still be flushing the profile as we go; the directory is a
  // tempdir either way, so a failure to sweep it is not a failure to shoot.
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
// The window-size flag sizes the window; this sizes the page, and is the only
// way to ask for a 2x capture.
await send('Emulation.setDeviceMetricsOverride', {
  width: WIDTH, height: HEIGHT, deviceScaleFactor: SCALE, mobile: false,
}, sessionId);

// --- Load, undress, shoot --------------------------------------------------

console.log(`→ ${URL_}`);
const load = until('Page.loadEventFired');
await send('Page.navigate', { url: URL_ }, sessionId);
await load;

// A loaded document is not a painted one: the app hydrates, then the webfonts
// land. Waiting on fonts.ready covers both in practice.
await evaluate(sessionId, 'document.fonts.ready.then(() => true)');
await sleep(1500);

const removed = await evaluate(sessionId, `(() => {
  const p = [...document.querySelectorAll('p, div, aside, section')]
    .find((el) => el.children.length <= 2 && el.textContent.trim().startsWith(${JSON.stringify(BANNER_TEXT)}));
  if (!p) return false;
  // The banner is the bordered strip wrapping that sentence, not the sentence.
  const strip = p.parentElement?.parentElement === document.body ? p.parentElement : p;
  strip.remove();
  return true;
})()`);

if (!removed) {
  // Shooting anyway would quietly ship a thumbnail with a demo banner on it.
  console.error(`Could not find the banner ("${BANNER_TEXT}"). Has its copy changed?`);
  console.error('Nothing was written. Update BANNER_TEXT in this script, or drop it if the banner is gone.');
  process.exit(1);
}

// Removing the strip moves everything up by its height; give the layout a frame.
await evaluate(sessionId, 'new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))');

const { data } = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }, sessionId);

mkdirSync(dirname(OUT), { recursive: true });
const bytes = Buffer.from(data, 'base64');
writeFileSync(OUT, bytes);

console.log(`✓ ${OUT.replace(`${root}/`, '')} — ${WIDTH * SCALE}×${HEIGHT * SCALE}, ${(bytes.length / 1024).toFixed(0)} KB`);

// The socket and the browser both hold the event loop open, so ask to leave
// rather than waiting to be let out. `exit` runs cleanup on the way.
process.exit(0);
