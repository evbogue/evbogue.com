// Actual upstream modules, separate origins, disposable data, no public traffic.
import { Buffer } from 'node:buffer';
import { chromium } from 'playwright';
import { strict as assert } from 'node:assert';
import { an, compose } from '../protocol.js';
import { createTimeline } from '../server.js';

const directory = await Deno.makeTempDir();
const key = await an.gen(), visitor = await an.gen();
const post = await compose(key, 'Hello from Wiredove. <script>throw new Error("unsafe")</script>', { name: 'Local owner' });
const reply = await compose(visitor, 'Local visitor reply', { reply: post.id, replyto: post.author });
const pinnedRoot = Deno.env.get('WIREDOVE_TEST_ROOT') || Deno.args[0];
let widgetRoot = pinnedRoot ? new URL('file://' + pinnedRoot.replace(/\/$/, '') + '/')
  : new URL('../../../wiredove/', import.meta.url);
if (!pinnedRoot) {
  try {
    const pin = JSON.parse(await Deno.readTextFile(new URL('../wiredove-client.json', import.meta.url)));
    if (!/^[a-f0-9]{40}$/.test(pin.revision)) throw new Error('Invalid widget test revision');
    widgetRoot = new URL('../vendor/wiredove/' + pin.revision + '/', import.meta.url);
  } catch (error) { if (!(error instanceof Deno.errors.NotFound)) throw error; }
}
const widgetServer = Deno.serve({ hostname: '127.0.0.1', port: 0, onListen() {} }, async request => {
  const path = new URL(request.url).pathname;
  if (!(path.startsWith('/client/') || path.startsWith('/vendor/') || path === '/style.css') || path.includes('..')) return new Response('Not found', { status: 404 });
  try {
    return new Response(await Deno.readFile(new URL('.' + path, widgetRoot)), {
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': path.endsWith('.css') ? 'text/css' : 'text/javascript' },
    });
  } catch { return new Response('Not found', { status: 404 }); }
});
const widgetOrigin = 'http://127.0.0.1:' + widgetServer.addr.port;
const app = await createTimeline({ directory, config: {
  owner: key.slice(0, 44), relay: '', wiredoveClient: widgetOrigin + '/client/ui.js',
  maxMediaBytes: 33554432, mediaQuotaBytes: 1073741824,
} });
for (const record of [post, reply]) {
  assert.equal((await app.fetch(new Request('http://localhost/timeline/api/posts', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(record),
  }))).status, 201);
}
const server = Deno.serve({ hostname: '127.0.0.1', port: 0, onListen() {} }, request => app.fetch(request));
const origin = 'http://127.0.0.1:' + server.addr.port;
let browser;
try {
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage();
  const errors = [], blocked = [], failedModules = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400 && response.url().startsWith(widgetOrigin)) failedModules.push(response.url()); });
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if ([origin, widgetOrigin].includes(url.origin)) return route.continue();
    blocked.push(url.href);
    return route.abort();
  });
  await page.goto(origin + '/timeline/');
  await page.locator('wiredove-widget wiredove-message').waitFor();
  assert.equal(await page.locator('wiredove-widget wiredove-message').count(), 1);
  assert.equal(await page.locator('#composer, #settings, #feed').count(), 0);
  assert.equal(await page.getByRole('button', { name: 'Write', exact: true }).count(), 0);
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await page.getByPlaceholder('Search messages').fill('Hello');
  await page.locator('form').getByRole('button', { name: 'Search', exact: true }).click();
  assert.equal(new URL(page.url()).searchParams.get('q'), 'Hello');
  await page.locator('wiredove-message .message-meta a').click();
  await page.locator('wiredove-thread').waitFor();
  assert.equal(new URL(page.url()).searchParams.get('post'), post.id);
  assert.equal(await page.locator('wiredove-thread wiredove-message').count(), 2);
  await page.reload();
  await page.locator('wiredove-thread wiredove-message').nth(1).waitFor();
  await page.goBack();
  await page.getByPlaceholder('Search messages').waitFor();
  assert.equal(await page.getByPlaceholder('Search messages').inputValue(), 'Hello');
  await page.goto(origin + '/timeline/?post=' + encodeURIComponent(post.id));
  await page.locator('wiredove-thread').waitFor();
  const screenshotDirectory = Deno.env.get('TIMELINE_SCREENSHOTS') || Deno.args[1];
  for (const width of [1280, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'Horizontal overflow at ' + width);
    if (screenshotDirectory) {
      await Deno.mkdir(screenshotDirectory, { recursive: true });
      await page.screenshot({ path: screenshotDirectory + '/timeline-thread-' + width + '.png', fullPage: true, animations: 'disabled' });
    }
  }
  // Exercise the actual reusable identity UI and IndexedDB draft/outbox.
  const replyAction = page.getByRole('button', { name: 'Reply to this post', exact: true }).first();
  await replyAction.focus(); await replyAction.press('Enter');
  await page.getByLabel('Display name', { exact: false }).fill('Disposable visitor');
  await page.getByRole('button', { name: 'Create identity', exact: true }).click();
  await page.getByRole('button', { name: 'Download identity backup', exact: true }).waitFor();
  assert.equal(await page.getByRole('button', { name: 'Write', exact: true }).count(), 0);
  await page.getByPlaceholder('Write a reply').fill('Published through the real site host adapter');
  // A real page reload must restore the route, identity and draft, including files.
  const imageBytes = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII='), c => c.charCodeAt(0));
  await page.locator('wiredove-composer input[accept="image/*"]').setInputFiles({ name: 'fixture.png', mimeType: 'image/png', buffer: Buffer.from(imageBytes) });
  await page.getByText('Attachment ready', { exact: true }).waitFor();
  await page.waitForTimeout(150);
  await page.reload();
  await page.getByRole('button', { name: 'Download identity backup', exact: true }).waitFor();
  await page.getByText('Attachment ready', { exact: true }).waitFor();
  assert.equal(await page.getByPlaceholder('Write a reply').inputValue(), 'Published through the real site host adapter');
  await page.route('**/timeline/api/posts', route => route.request().method() === 'POST'
    ? route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'Fixture storage unavailable' }) })
    : route.continue());
  await page.locator('wiredove-composer').getByRole('button', { name: 'Reply', exact: true }).click();
  await page.getByText('Fixture storage unavailable', { exact: true }).waitFor();
  assert.equal(await page.getByPlaceholder('Write a reply').inputValue(), 'Published through the real site host adapter');
  await page.getByRole('button', { name: 'Retry pending publication', exact: true }).waitFor();
  await page.reload();
  await page.getByRole('button', { name: 'Retry pending publication', exact: true }).waitFor();
  await page.unroute('**/timeline/api/posts');
  await page.getByRole('button', { name: 'Retry pending publication', exact: true }).click();
  await page.getByText('Published through the real site host adapter', { exact: true }).waitFor();
  const stored = await (await app.fetch(new Request(origin + '/timeline/api/posts'))).json();
  assert.equal(stored.posts.length, 3);
  const published = stored.posts.find(row => row.parsed.body === 'Published through the real site host adapter');
  assert.equal(published.parsed.mime, 'image/png');
  assert.ok(published.parsed.andfs);
  await page.reload();
  await page.getByText('Published through the real site host adapter', { exact: true }).waitFor();
  assert.equal(await page.getByRole('button', { name: 'Write', exact: true }).count(), 0);
  // Owner backup import enables Write; signing keys never go to the API.
  await page.getByRole('button', { name: 'Identity & pending posts', exact: true }).click();
  // This context has a local-only outbox, so use a separate browser for owner import.
  const ownerPage = await browser.newPage();
  await ownerPage.route('**/*', route => [origin, widgetOrigin].includes(new URL(route.request().url()).origin) ? route.continue() : route.abort());
  await ownerPage.goto(origin + '/timeline/');
  await ownerPage.getByRole('button', { name: 'Identity & pending posts', exact: true }).click();
  await ownerPage.getByLabel('Import Wiredove identity backup', { exact: false }).setInputFiles({ name: 'identity.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ keypair: key, name: 'Local owner' })) });
  await ownerPage.getByRole('button', { name: 'Write', exact: true }).click();
  await ownerPage.getByPlaceholder('Write a message').fill('Owner publication through shared components');
  await ownerPage.locator('wiredove-composer').getByRole('button', { name: 'Publish', exact: true }).click();
  await ownerPage.getByText('Owner publication through shared components', { exact: true }).waitFor();
  await ownerPage.close();
  assert.deepEqual(errors, []);
  assert.deepEqual(failedModules, []);
  assert.deepEqual(blocked.filter(url => new URL(url).hostname !== 'fonts.googleapis.com'), [], 'Widget must not request public data or relay services in this fixture');
  await page.route(widgetOrigin + '/client/ui.js', route => route.abort());
  await page.reload();
  await page.getByRole('status').filter({ hasText: 'Unable to load the Wiredove widget:' }).waitFor();
  assert.equal(await page.locator('article, wiredove-message').count(), 0);
  console.log('Passed: actual separate-origin widget, owner feed, visitor thread, durable URLs/reload/Back, 1280/390/320px, real identity create/import, persistent file drafts/outbox, signed reply retry and owner publish via site API, reply reload, public traffic blocked, module failure.');
} finally {
  await browser?.close();
  await server.shutdown();
  await widgetServer.shutdown();
  await Deno.remove(directory, { recursive: true });
}
