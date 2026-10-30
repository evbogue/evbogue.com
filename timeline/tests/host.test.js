import { strict as assert } from 'node:assert';
import { an, compose } from '../protocol.js';
import { createHost, readRoute, routeURL } from '../host.js';
import { createTimeline } from '../server.js';

Deno.test('host keeps owner originals and connected replies; verifies every signed record', async () => {
  const key = await an.gen(), visitor = await an.gen();
  const root = await compose(key, 'Owner original');
  const reply = await compose(visitor, 'Visitor reply', { reply: root.id, replyto: root.author });
  const nested = await compose(key, 'Nested reply', { reply: reply.id, replyto: reply.author });
  const unrelated = await compose(visitor, 'Other author original');
  const edit = await compose(key, 'Edited body', { edit: root.id });
  const profile = await compose(key, 'Profile update', { type: 'profile' });
  let posts = [nested, reply, unrelated, edit, profile, root];
  const host = createHost({ owner: root.author, relay: '' }, {
    fetcher: () => Promise.resolve(Response.json({ posts })),
  });
  assert.equal((await host.loadPosts()).length, 3);
  assert.deepEqual((await host.loadFeed()).posts.map(post => post.id), [root.id]);
  assert.equal((await host.getReplies(root.id)).posts[0].id, reply.id);
  assert.equal((await host.getPost(nested.id)).id, nested.id);
  assert.equal((await host.getReplies(root.id)).complete, false);
  posts = [{ ...root, content: root.content + 'tampered' }];
  await assert.rejects(() => host.loadPosts(), /hash/);
});

Deno.test('host publishes exact bytes, reports local-only save, reloads and rejects unauthorized roots', async () => {
  const key = await an.gen(), visitor = await an.gen();
  const directory = await Deno.makeTempDir();
  const config = { owner: key.slice(0, 44), relay: '', maxMediaBytes: 33554432, mediaQuotaBytes: 1073741824 };
  try {
    let app = await createTimeline({ directory, config });
    const host = createHost(config, { fetcher: (path, options) => app.fetch(new Request('http://localhost' + path, options)) });
    const root = await compose(key, 'Preserve exact signed bytes\nAnd this newline');
    const saved = await host.publishSigned(root);
    assert.equal(saved.saved, true);
    assert.equal(saved.relayed, false);
    assert.equal((await host.latest(root.author)).latest.content, root.content);
    const reply = await compose(visitor, 'Reply', { reply: root.id, replyto: root.author });
    await host.publishSigned(reply);
    await host.publishSigned(reply);
    assert.equal((await host.loadPosts()).length, 2);
    const forbidden = await compose(visitor, 'Unauthorized root');
    await assert.rejects(() => host.publishSigned(forbidden), /Only Ev/);
    app = await createTimeline({ directory, config });
    assert.equal((await host.getReplies(root.id)).posts[0].content, reply.content);
    assert.equal((await host.sync()).disabled, true);
  } finally {
    await Deno.remove(directory, { recursive: true });
  }
});

Deno.test('durable routes round trip padded base64 identifiers and reject external route input', () => {
  const id = '+/' + 'a'.repeat(41) + '=';
  for (const route of [{ type: 'post', id }, { type: 'profile', author: id }, { type: 'search', query: 'hello & goodbye' }, { type: 'feed' }]) {
    assert.deepEqual(readRoute(new URL(routeURL(route, 'https://evbogue.com/'), 'https://evbogue.com/')), route);
  }
  assert.equal(routeURL({ type: 'compose' }, 'https://evbogue.com/'), '/timeline/?view=compose');
  assert.deepEqual(readRoute('https://evbogue.com' + routeURL({ type: 'compose', replyTo: { id } }, 'https://evbogue.com/')), { type: 'compose', replyId: id });
  assert.deepEqual(readRoute('https://evbogue.com/timeline/?post=https://evil.test'), { type: 'feed' });
});

Deno.test('host retains exact signed pending post for relay retry and confirmation', async () => {
  const key = await an.gen();
  const directory = await Deno.makeTempDir();
  const config = { owner: key.slice(0, 44), relay: 'https://isolated-relay.test', maxMediaBytes: 33554432, mediaQuotaBytes: 1073741824 };
  const values = new Map();
  let unavailable = true;
  const relayFetch = async (_url, options) => {
    if (unavailable) throw new Error('Isolated relay unavailable');
    const value = options.body;
    if (values.has(value)) return Response.json({ messages: [values.get(value)] });
    values.set(await an.hash(value), value);
    return Response.json({ messages: [] });
  };
  try {
    const app = await createTimeline({ directory, config, relayFetch });
    const host = createHost(config, { fetcher: (path, options) => app.fetch(new Request('http://localhost' + path, options)) });
    const post = await compose(key, 'Retry these exact signed bytes');
    const pending = await host.publishSigned(post);
    assert.equal(pending.saved, true);
    assert.equal(pending.relayed, false);
    assert.match(pending.relayError, /unavailable/);
    unavailable = false;
    const confirmed = await host.publishSigned(pending.post);
    assert.equal(confirmed.relayed, true);
    assert.equal(values.get(post.contentHash), post.content);
    assert.equal(values.get(post.id), post.signature);
    assert.equal((await host.loadPosts()).length, 1);
  } finally { await Deno.remove(directory, { recursive: true }); }
});

Deno.test('pinned widget assets match provenance and are served only from the manifest', async () => {
  const pin = JSON.parse(await Deno.readTextFile(new URL('../wiredove-client.json', import.meta.url)));
  assert.match(pin.revision, /^[a-f0-9]{40}$/);
  assert.equal(pin.repository, 'https://github.com/evbogue/wiredove');
  assert.equal(pin.entry, '/timeline/vendor/wiredove/' + pin.revision + '/client/ui.js');
  for (const [path, expected] of Object.entries(pin.files)) {
    const bytes = await Deno.readFile(new URL('../vendor/wiredove/' + pin.revision + '/' + path, import.meta.url));
    const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)))
      .map(byte => byte.toString(16).padStart(2, '0')).join('');
    assert.equal(digest, expected, path);
  }
  const directory = await Deno.makeTempDir();
  try {
    const key = await an.gen();
    const app = await createTimeline({ directory, config: { owner: key.slice(0, 44), relay: '', wiredoveClient: pin.entry } });
    const get = path => app.fetch(new Request('http://localhost' + path));
    const response = await get(pin.entry);
    assert.equal(response.status, 200);
    assert.match(response.headers.get('Content-Type'), /javascript/);
    assert.match(await response.text(), /defineWiredoveElements/);
    const style = await get(pin.entry.replace('client/ui.js', 'style.css'));
    assert.equal(style.status, 200);
    assert.match(style.headers.get('Content-Type'), /text\/css/);
    assert.equal((await get(pin.entry.replace('client/ui.js', 'config.json'))).status, 404);
    const different = (pin.revision[0] === '0' ? '1' : '0') + pin.revision.slice(1);
    assert.equal((await get(pin.entry.replace(pin.revision, different))).status, 404);
  } finally { await Deno.remove(directory, { recursive: true }); }
});
