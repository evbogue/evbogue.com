// Actual site bootstrap + full pinned application, two origins, disposable keys.
import { historicalCompatibility } from './historical.browser.js';
import { chromium } from 'playwright';
import { strict as assert } from 'node:assert';
import { an, compose } from '../protocol.js';
import { createTimeline } from '../server.js';
const directory = await Deno.makeTempDir();
const owner = await an.gen(), visitor = await an.gen();
const pin = JSON.parse(await Deno.readTextFile(new URL('../wiredove-client.json', import.meta.url)));
const errors = [];
let browser, server, second;
try {
  const config = { owner: owner.slice(0,44), relay: '', wiredoveClient: pin.entry, wiredoveApplication: pin.entry.replace('client/ui.js', 'dist/app-v1/app-embed.js'), maxMediaBytes: 33554432, mediaQuotaBytes: 1073741824, publicOrigins: [] };
  const app = await createTimeline({ directory, config });
  const root = await compose(owner, 'Local application owner original', { name: 'Local Owner' });
  await app.fetch(new Request('http://local/timeline/api/posts', { method: 'POST', body: JSON.stringify(root) }));
  server = Deno.serve({ hostname: '127.0.0.1', port: 0, onListen() {} }, request => new URL(request.url).pathname === '/seed' ? new Response('<!doctype html><title>Storage fixture</title>', { headers: { 'Content-Type': 'text/html' } }) : app.fetch(request));
  const origin = 'http://127.0.0.1:' + server.addr.port;
  second = Deno.serve({ hostname: '127.0.0.1', port: 0, onListen() {} }, () => new Response(`<!doctype html><meta name="viewport" content="width=device-width"><div id="embed"></div><script type="module">import {mountWiredove} from '${origin}${pin.entry.replace('client/ui.js','dist/app-v1/app-embed.js')}';const config=await(await fetch('${origin}/timeline/api/config')).json();window.app=await mountWiredove(document.getElementById('embed'),{backendURL:'${origin}/timeline',mediaURL:'${origin}/timeline',legacyImageURL:'${origin}/timeline/api/image',legacyMediaURL:config.legacyMediaURL});window.ready=true;</script>`, { headers: { 'Content-Type': 'text/html' } }));
  const otherOrigin = 'http://127.0.0.1:' + second.addr.port;
  config.publicOrigins.push(otherOrigin);
  const cache = new Map(), allowedOrigins = new Set([origin, otherOrigin]);
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1200, height: 1000 } });
  const routeHandler = async route => {
    const request = route.request(), url = request.url();
    if (allowedOrigins.has(new URL(url).origin)) return route.continue();
    if (request.method() !== 'GET') return route.abort();
    const match = url.match(/^https:\/\/esm.sh\/gh\/evbogue\/apds@(4934fac|78abedd)\/(.+)$/);
    if (match || /^https:\/\/cdn.jsdelivr.net\/npm\/idb@8(?:\.0\.3)?\/\+esm$/.test(url)) {
      if (!cache.has(url)) { const response = await fetch(match ? `https://raw.githubusercontent.com/evbogue/apds/${match[1]}/${match[2]}` : url); assert(response.ok); cache.set(url, await response.text()); }
      return route.fulfill({ contentType: 'text/javascript', body: cache.get(url) });
    }
    if (url === 'https://esm.sh/gh/evbogue/anproto@ddc040c/an.js') return route.fulfill({ contentType: 'text/javascript', body: `export {an} from '${origin}/timeline/vendor/anproto/an.js'` });
    if (['fonts.googleapis.com','fonts.gstatic.com'].includes(new URL(url).hostname)) return route.continue();
    return route.abort();
  };
  await context.route('**/*', routeHandler);
  const page = await context.newPage(); page.on('console', message => { if (message.type() === 'error') console.log(message.text()); }); page.on('pageerror', error => errors.push(error.message));
  await page.goto(origin + '/seed');
  // Seed the old site's real storage contract, then upgrade without clearing it.
  await page.evaluate(async ({ pin, visitor, root }) => {
    const { createBrowserStore } = await import(pin.entry.replace('ui.js','runtime/browser-store.js'));
    const store = createBrowserStore('evbogue-wiredove');
    await store.set('identity', { keypair: visitor, name: 'Migrated Visitor' });
    await store.set('draft:' + root.id, { body: 'Migrated visitor reply draft', file: new File([new Uint8Array([1,2,3])], 'previous.wav', { type: 'audio/wav' }) });
  }, { pin, visitor, root });
  await page.goto(origin + '/timeline/');
  await page.waitForFunction(() => window.timelineApplication).catch(async error => { console.log(await page.locator('#status').textContent(), errors); throw error; });
  await page.getByText('Local application owner original', { exact: true }).waitFor();
  assert.equal(await page.getByRole('button', { name: 'Compose', exact: true }).count(), 0);
  await page.evaluate(id => window.timelineApplication.navigate(id), root.id);
  console.log('Migrated site ready');
  await page.getByRole('button', { name: 'Reply', exact: true }).first().click();
  assert.equal(await page.getByPlaceholder('Write a message').inputValue(), 'Migrated visitor reply draft');
  await page.getByRole('button', { name: 'Restore previous attachment: previous.wav', exact: true }).waitFor();
  await page.getByPlaceholder('Write a message').fill('Local full application visitor reply');
  await page.getByRole('button', { name: 'Reply', exact: true }).last().click();
  await page.getByPlaceholder('Write a message').waitFor({ state: 'hidden' });
  await page.reload(); await page.waitForFunction(() => window.timelineApplication).catch(async error => { console.log(await page.locator('#status').textContent(), errors); throw error; });
  await page.getByText('Local full application visitor reply', { exact: true }).waitFor();
  assert(new URL(page.url()).searchParams.get('post') === root.id);
  const rows = app.readPosts();
  assert.equal(rows.filter(row => row.parsed.body === 'Local full application visitor reply').length, 1);
  const reply = rows.find(row => row.parsed.body === 'Local full application visitor reply');
  assert.equal(reply.author, visitor.slice(0,44));
  assert.equal(reply.parsed.reply, root.id);
  const originalReplyContent = reply.content;
  await page.locator('[id="' + reply.id + '"]').getByText('Edit', {exact:true}).click();
  await page.getByPlaceholder('Write a message').fill('Local edited visitor reply');
  await page.getByRole('button',{name:'Save changes',exact:true}).click();
  await page.getByPlaceholder('Write a message').waitFor({state:'hidden'});
  const edit = app.readPosts().find(row => row.parsed.edit === reply.id);
  assert(edit && edit.author === reply.author);
  assert.equal(edit.parsed.body, 'Local edited visitor reply');
  assert.equal(app.readPosts().find(row => row.id === reply.id).content, originalReplyContent);
  await page.reload(); await page.waitForFunction(() => window.timelineApplication);
  await page.getByText('Local edited visitor reply',{exact:true}).first().waitFor();
  console.log('Site migration, reply, compatible edit and reload passed');
  const embed = await context.newPage(); embed.on('console', message => console.log('Embed:', message.text())); embed.on('requestfailed', request => console.log('Failed:',request.url(),request.failure())); embed.on('pageerror', error => errors.push(error.message));
  await embed.goto(otherOrigin); await embed.waitForFunction(() => window.ready);
  await embed.evaluate(id => window.app.navigate(id), root.id);
  await embed.getByText('Local edited visitor reply', { exact: true }).waitFor();
  await embed.reload(); await embed.waitForFunction(() => window.ready);
  await embed.evaluate(id => window.app.navigate(id), root.id);
  await embed.getByText('Local edited visitor reply', { exact: true }).waitFor();
  await embed.getByRole('button',{name:'Create or import identity',exact:true}).click();
  await embed.getByPlaceholder('How should people know you?').fill('Local Reverse Visitor');
  await embed.getByRole('button',{name:'Create identity',exact:true}).click();
  await embed.getByRole('button',{name:'Save changes',exact:true}).click();
  await embed.getByRole('button',{name:'Save changes',exact:true}).waitFor({state:'hidden'});
  await embed.evaluate(id => app.navigate(id), root.id);
  await embed.getByRole('button',{name:'Reply',exact:true}).first().click();
  await embed.getByPlaceholder('Write a message').fill('Local reverse application reply');
  await embed.getByRole('button',{name:'Reply',exact:true}).last().click();
  await embed.getByPlaceholder('Write a message').waitFor({state:'hidden'});
  await page.evaluate(async () => { await timelineApplication.session.refresh(); });
  await page.reload(); await page.waitForFunction(() => window.timelineApplication);
  await page.getByText('Local reverse application reply',{exact:true}).waitFor();
  const ownerContext = await browser.newContext({ viewport: { width: 1200, height: 950 } });
  await ownerContext.route('**/*', routeHandler);
  const ownerPage = await ownerContext.newPage();
  await ownerPage.goto(origin + '/seed');
  await ownerPage.evaluate(async ({pin,owner}) => {
    const {createBrowserStore} = await import(pin.entry.replace('ui.js','runtime/browser-store.js'));
    await createBrowserStore('evbogue-wiredove').set('identity',{keypair:owner,name:'Local Owner'});
  }, {pin,owner});
  await ownerPage.goto(origin + '/timeline/'); await ownerPage.waitForFunction(() => window.timelineApplication);
  await ownerPage.getByRole('button',{name:'Compose',exact:true}).click();
  await ownerPage.getByPlaceholder('Write a message').fill('Local owner exact retry');
  await ownerPage.route('**/timeline/api/application', route => route.request().method() === 'POST' ? route.fulfill({status:503,body:'offline'}) : route.continue());
  await ownerPage.getByRole('button',{name:'Publish',exact:true}).click();
  await ownerPage.getByText('Saved locally. Delivery is pending; use Retry pending publication in the navigation bar.',{exact:true}).waitFor();
  const pending = await ownerPage.evaluate(() => timelineApplication.session.artifacts.pending());
  assert.equal(pending.length,1);
  await ownerPage.reload(); await ownerPage.waitForFunction(() => window.timelineApplication);
  await ownerPage.unroute('**/timeline/api/application');
  await ownerPage.getByRole('button',{name:'Retry pending publication',exact:true}).click();
  await ownerPage.getByText('Delivery confirmed',{exact:true}).waitFor();
  assert.equal(app.readPosts().filter(row=>row.id===pending[0].id).length,1);
  assert.equal(app.readPosts().find(row=>row.id===pending[0].id).signature,pending[0].signature);
  await embed.evaluate(async id => { await app.session.refresh(); await app.navigate(id); }, pending[0].id);
  await embed.getByText('Local owner exact retry',{exact:true}).waitFor();
  await historicalCompatibility({ page, embed, ownerPage, app, config, directory, owner, origin, pin,
    allowOrigin: value => { allowedOrigins.add(value); } });
  await page.evaluate(id => timelineApplication.navigate(id), root.id);
  await ownerContext.close();
  await Deno.mkdir('test-results' , { recursive: true });
  for (const width of [1200,390,320]) for (const colorScheme of ['light','dark']) {
    await page.setViewportSize({ width, height: 950 }); await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
    await page.addStyleTag({ content: '* { animation: none !important; }' });
    await page.evaluate(() => { const style = document.createElement('style'); style.textContent = '* {animation:none!important}'; document.getElementById('wiredove-timeline').shadowRoot.append(style); });
    await page.screenshot({ path: `test-results/application-${width}-${colorScheme}.png`, fullPage: true, animations: 'disabled' });
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  }
  assert.deepEqual(errors, []);
  console.log('Passed full pinned application: old identity/File/text draft migration, owner-only Compose, signed visitor reply, durable site URLs/reload, separate-origin retrieval/reload, 1200/390/320 light/dark. No public writes.');
} finally {
  await browser?.close(); await second?.shutdown(); await server?.shutdown(); await Deno.remove(directory, { recursive: true });
}
