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
    assert.equal(/<style|stylesheet|style=/.test(html), false)
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
