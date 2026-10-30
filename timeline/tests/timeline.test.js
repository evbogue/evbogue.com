import { strict as assert } from 'node:assert'
import { an, compose, identity, verify, yaml } from '../protocol.js'
import { byteRange, createTimeline } from '../server.js'
import { createAndFS } from '../vendor/andfs/andfs.js'
import { memoryStore } from '../vendor/andfs/stores.js'

async function fixture(relayFetch) {
  const ownerKey = await an.gen(), visitorKey = await an.gen()
  const directory = await Deno.makeTempDir()
  const config = {
    owner: ownerKey.slice(0, 44),
    relay: relayFetch ? 'https://relay.test' : '',
    maxMediaBytes: 33554432,
    mediaQuotaBytes: 1073741824,
  }
  const app = await createTimeline({ directory, config, relayFetch })
  const call = (path, body, method = body ? 'POST' : 'GET') =>
    app.fetch(
      new Request('http://localhost/timeline/' + path, {
        method,
        ...(body
          ? {
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          }
          : {}),
      }),
    )
  return {
    app,
    config,
    directory,
    ownerKey,
    visitorKey,
    call,
    close: () => Deno.remove(directory, { recursive: true }),
  }
}
Deno.test('Wiredove-compatible signature, YAML fields, identity import and tamper rejection', async () => {
  const key = await an.gen(), other = await an.gen()
  assert.equal(await identity(key), key.slice(0, 44))
  await assert.rejects(() => identity(other.slice(0, 44) + key.slice(44)))
  const parent = await compose(key, 'Hello\nworld', { name: 'Ev' })
  const reply = await compose(other, 'A reply', {
    name: 'Alice',
    previous: parent.id,
    reply: parent.id,
    replyto: parent.author,
  })
  assert.equal(
    (await yaml.parse(reply.content)).reply,
    await an.hash(parent.signature),
  )
  assert.equal(
    await an.open(reply.signature),
    String(reply.timestamp) + await an.hash(reply.content),
  )
  await assert.rejects(() => verify(reply.signature, reply.content + '!'))
  await assert.rejects(() =>
    verify(other.slice(0, 44) + parent.signature.slice(44), parent.content)
  )
})
Deno.test('owner-only roots, visitor replies, duplicate posts, durable storage and exports', async () => {
  const f = await fixture()
  try {
    const invalidRoot = await compose(f.visitorKey, 'Not Ev', { name: 'Ev' })
    assert.equal((await f.call('api/posts', invalidRoot)).status, 400)
    const root = await compose(f.ownerKey, '<script>alert(1)</script>', {
      name: 'Ev',
    })
    assert.equal((await f.call('api/posts', root)).status, 201)
    assert.equal((await f.call('api/posts', root)).status, 201)
    const wrong = await compose(f.visitorKey, 'Wrong parent author', {
      reply: root.id,
      replyto: f.visitorKey.slice(0, 44),
    })
    assert.equal((await f.call('api/posts', wrong)).status, 400)
    const reply = await compose(f.visitorKey, 'Hello Ev', {
      reply: root.id,
      replyto: root.author,
    })
    assert.equal((await f.call('api/posts', reply)).status, 201)
    const restarted = await createTimeline({
      directory: f.directory,
      config: f.config,
    })
    const rows = await (await restarted.fetch(
      new Request('http://localhost/timeline/api/export'),
    )).json()
    assert.equal(rows.posts.length, 2)
    assert.equal(
      rows.posts.some((row) => row.signature === root.signature),
      true,
    )
    assert.equal(JSON.stringify(rows).includes(f.ownerKey), false)
    const crossOrigin = await f.app.fetch(
      new Request('http://localhost/timeline/api/posts', {
        method: 'POST',
        headers: { Origin: 'https://evil.test' },
        body: JSON.stringify(root),
      }),
    )
    assert.equal(crossOrigin.status, 403)
    const html = await (await f.call('')).text()
    assert.equal(html.includes('class="timeline"'), true)
  } finally {
    await f.close()
  }
})
Deno.test('AndFS signed upload, corruption rejection, full/range reads, HEAD and restart', async () => {
  const f = await fixture()
  try {
    const bytes = new Uint8Array(600000)
    for (let i = 0; i < bytes.length; i++) bytes[i] = i % 251
    const added = await createAndFS({ store: memoryStore() }).add(bytes)
    const meta = {
      action: 'andfs-upload-v1',
      andfs: added.manifestHash,
      mime: 'audio/wav',
      media_size: bytes.length,
    }
    const content = JSON.stringify(meta),
      signature = await an.sign(await an.hash(content), f.ownerKey)
    const upload = (body) =>
      f.app.fetch(
        new Request('http://localhost/timeline/api/media', {
          method: 'POST',
          headers: {
            'X-ANProto-Signature': signature,
            'X-ANProto-Content': content,
          },
          body,
        }),
      )
    const corrupt = bytes.slice()
    corrupt[0] ^= 1
    assert.equal((await upload(corrupt)).status, 400)
    assert.equal((await upload(bytes)).status, 201)
    assert.equal((await upload(bytes)).status, 200)
    const get = (headers = {}, method = 'GET') =>
      f.app.fetch(
        new Request('http://localhost/timeline/media/' + added.manifestHash, {
          headers,
          method,
        }),
      )
    assert.deepEqual(new Uint8Array(await (await get()).arrayBuffer()), bytes)
    for (
      const [range, start, end] of [['bytes=262140-262150', 262140, 262151], [
        'bytes=-10',
        599990,
        600000,
      ], ['bytes=599990-', 599990, 600000]]
    ) {
      const response = await get({ Range: range })
      assert.equal(response.status, 206)
      assert.deepEqual(
        new Uint8Array(await response.arrayBuffer()),
        bytes.slice(start, end),
      )
    }
    assert.equal((await get({ Range: 'bytes=999999-' })).status, 416)
    const head = await get({ Range: 'bytes=-10' }, 'HEAD')
    assert.equal(head.headers.get('content-length'), '10')
    assert.equal((await head.arrayBuffer()).byteLength, 0)
    const restarted = await createTimeline({
      directory: f.directory,
      config: f.config,
    })
    assert.equal(
      (await restarted.fetch(
        new Request('http://localhost/timeline/media/' + added.manifestHash, {
          method: 'HEAD',
        }),
      )).status,
      200,
    )
    const post = await compose(f.ownerKey, 'Audio', {
      type: 'audio',
      andfs: added.manifestHash,
      mime: 'audio/wav',
      media_size: bytes.length,
    })
    assert.equal((await f.call('api/posts', post)).status, 201)
  } finally {
    await f.close()
  }
})
Deno.test('range rejects malformed, reversed, unsafe and multi-range requests', () => {
  for (
    const value of [
      'bytes=-0',
      'bytes=-',
      'bytes=4-2',
      'bytes=0-1,4-5',
      'bytes=999999999999999999-',
    ]
  ) assert.throws(() => byteRange(value, 10))
  assert.deepEqual(byteRange('bytes=-20', 10), {
    start: 0,
    end: 10,
    status: 206,
  })
})
Deno.test('relay round trip uses exact signed content and receives a Wiredove reply', async () => {
  const blobs = new Map()
  let latest = null
  const history = []
  const relayFetch = async (url, options = {}) => {
    if (url.includes('/gossip/poll')) {
      return Response.json({ messages: history, nextSince: 1 })
    }
    const value = options.body
    if (value.length === 44) {
      return Response.json({
        messages: [
          ...(blobs.has(value) ? [blobs.get(value)] : []),
          ...(latest && latest.author === value ? [latest.signature] : []),
        ],
      })
    }
    blobs.set(await an.hash(value), value)
    history.push(value)
    return Response.json({ messages: [] })
  }
  const f = await fixture(relayFetch)
  try {
    const root = await compose(f.ownerKey, 'A post', { name: 'Ev' })
    latest = root
    const result = await (await f.call('api/posts', root)).json()
    assert.equal(result.relayed, true)
    assert.equal(blobs.get(root.contentHash), root.content)
    const reply = await compose(f.visitorKey, 'From Wiredove', {
      reply: root.id,
      replyto: root.author,
      name: 'Alice',
    })
    blobs.set(reply.id, reply.signature)
    blobs.set(reply.contentHash, reply.content)
    history.push(reply.signature, reply.content)
    const sync = await (await f.call('api/sync', {}, 'POST')).json()
    assert.equal(sync.added, 1)
    assert.equal((await (await f.call('api/posts')).json()).posts.length, 2)
  } finally {
    await f.close()
  }
})

Deno.test('historical images verify exact hashes, cache across restart and reject unrelated requests', async () => {
  const source = 'data:image/png;base64,iVBORw0KGgo=';
  const id = await an.hash(source);
  let offline = false;
  const f = await fixture(async (_url, options) => {
    if (offline) throw new Error('offline');
    return Response.json({ messages: options.body === id ? [source + 'tampered', source] : [] });
  });
  try {
    const post = await compose(f.ownerKey, '![](' + id + ')', { image: id });
    // Import is a local verified ingestion without an outbound publication.
    await f.call('api/import', { posts: [post] });
    let response = await f.call('api/image?hash=' + encodeURIComponent(id));
    assert.equal(response.status, 200);
    assert.equal((await response.json()).source, source);
    offline = true;
    const reopened = await createTimeline({ directory: f.directory, config: f.config });
    response = await reopened.fetch(new Request('http://localhost/timeline/api/image?hash=' + encodeURIComponent(id)));
    assert.equal((await response.json()).source, source);
    assert.equal((await f.call('api/image?hash=' + encodeURIComponent(await an.hash('unrelated')))).status, 400);
  } finally { await f.close(); }
});

Deno.test('bounded owner history resumes beyond thirty messages across server restarts', async () => {
  const key = await an.gen(), directory = await Deno.makeTempDir();
  const values = new Map();
  let previous;
  for (let index = 0; index < 65; index++) {
    const record = await compose(key, 'History ' + index, previous ? { previous } : {});
    values.set(record.id, record.signature); values.set(record.contentHash, record.content);
    previous = record.id;
  }
  values.set(key.slice(0, 44), values.get(previous));
  const config = { owner: key.slice(0, 44), relay: 'http://local.test', maxMediaBytes: 33554432, mediaQuotaBytes: 1073741824 };
  const relayFetch = (url, options) => Promise.resolve(Response.json(url.includes('/poll?')
    ? { messages: [], nextSince: 1 } : { messages: values.has(options.body) ? [values.get(options.body)] : [] }));
  try {
    for (const expected of [30, 60, 65, 65]) {
      const app = await createTimeline({ directory, config, relayFetch });
      const sync = await app.fetch(new Request('http://localhost/timeline/api/sync', { method: 'POST' }));
      assert.equal(sync.status, 200);
      const posts = await (await app.fetch(new Request('http://localhost/timeline/api/posts'))).json();
      assert.equal(posts.posts.length, expected);
    }
  } finally { await Deno.remove(directory, { recursive: true }); }
});

Deno.test('configured public origins permit proxy writes without trusting forwarded headers', async () => {
  const f = await fixture();
  try {
    const app = await createTimeline({ directory: f.directory, config: { ...f.config, publicOrigins: ['https://evbogue.com', 'https://www.evbogue.com'] } });
    const post = await compose(f.ownerKey, 'Proxy origin fixture');
    const request = (origin, record = post, extra = {}) => new Request('http://localhost:8082/timeline/api/posts', {
      method: 'POST', headers: { ...(origin === undefined ? {} : { Origin: origin }), ...extra }, body: JSON.stringify(record),
    });
    for (const origin of ['https://foreign.example', 'null', 'http://evbogue.com', 'https://evbogue.com.evil.example', 'https://evbogue.com:444']) {
      assert.equal((await app.fetch(request(origin, post, { 'X-Forwarded-Host': 'evbogue.com', 'X-Forwarded-Proto': 'https' }))).status, 403, origin);
    }
    assert.equal((await app.fetch(request('https://evbogue.com', { ...post, content: 'tampered' }))).status, 400);
    assert.equal((await app.fetch(request('https://evbogue.com'))).status, 201);
    for (const origin of ['https://www.evbogue.com', 'http://localhost:8082', undefined]) {
      assert.ok((await app.fetch(request(origin))).ok, String(origin));
    }
    const unconfigured = await createTimeline({ directory: f.directory, config: f.config });
    assert.equal((await unconfigured.fetch(request('https://evbogue.com'))).status, 403);
  } finally { await f.close(); }
});
