import { an, isAndFS, isHash, open, verify } from './protocol.js'
import { createAndFS, MAX_MANIFEST } from './vendor/andfs/andfs.js'
import { diskStore, memoryStore } from './vendor/andfs/stores.js'

const encoder = new TextEncoder()
const MIME = new Set([
  'audio/mpeg',
  'audio/mp4',
  'audio/ogg',
  'audio/webm',
  'audio/wav',
  'audio/x-wav',
  'video/mp4',
  'video/webm',
  'video/ogg',
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
])
const json = (value, status = 200) =>
  new Response(JSON.stringify(value), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  })
const safeID = (id) => encodeURIComponent(id)

export async function readLimited(body, limit) {
  if (!body) return new Uint8Array()
  const reader = body.getReader(), parts = []
  let length = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      length += value.length
      if (length > limit) throw new Error('Request is too large')
      parts.push(value)
    }
  } finally {
    await reader.cancel().catch(() => {})
    reader.releaseLock()
  }
  const bytes = new Uint8Array(length)
  let offset = 0
  for (const part of parts) {
    bytes.set(part, offset)
    offset += part.length
  }
  return bytes
}

export function byteRange(header, size) {
  if (!header) return { start: 0, end: size, status: 200 }
  const match = /^bytes=(\d*)-(\d*)$/.exec(header)
  if (!match || (!match[1] && !match[2])) throw new Error('Invalid range')
  const start = match[1]
    ? Number(match[1])
    : Math.max(0, size - Number(match[2]))
  const end = match[1]
    ? (match[2] ? Math.min(size, Number(match[2]) + 1) : size)
    : size
  if (
    !Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 ||
    start >= end || end > size
  ) throw new Error('Invalid range')
  return { start, end, status: 206 }
}

export async function createTimeline(
  { directory, config, relayFetch = fetch },
) {
  if (!isHash(config.owner)) {
    throw new Error('Configure a valid timeline owner public key')
  }
  const messages = new Map()
  const media = new Map()
  const store = await diskStore(directory + '/andfs')
  const files = createAndFS({ store })
  await Deno.mkdir(directory + '/messages', { recursive: true })
  await Deno.mkdir(directory + '/media', { recursive: true })
  for await (const file of Deno.readDir(directory + '/messages')) {
    if (!file.name.endsWith('.json')) continue
    const row = JSON.parse(
      await Deno.readTextFile(directory + '/messages/' + file.name),
    )
    const verified = await verify(row.signature, row.content)
    messages.set(verified.id, { ...verified, relayed: row.relayed === true })
  }
  for await (const file of Deno.readDir(directory + '/media')) {
    if (!file.name.endsWith('.json')) continue
    const meta = JSON.parse(
      await Deno.readTextFile(directory + '/media/' + file.name),
    )
    media.set(meta.andfs, meta)
  }
  async function atomic(path, value) {
    const temporary = path + '.' + crypto.randomUUID() + '.tmp'
    try {
      await Deno.writeTextFile(temporary, JSON.stringify(value))
      await Deno.rename(temporary, path)
    } finally {
      await Deno.remove(temporary).catch(() => {})
    }
  }
  function allowed(author, parent, replyto) {
    if (!parent) return author === config.owner
    const target = messages.get(parent)
    return !!target && (!replyto || replyto === target.author)
  }
  function acceptShape(row) {
    const p = row.parsed
    if (p.edit) {
      throw new Error('Edit events are not supported in this first version')
    }
    if (!allowed(row.author, p.reply, p.replyto)) {
      throw new Error(
        'Only Ev can start posts; replies must reference a known conversation and its author',
      )
    }
  }
  async function persist(row) {
    await atomic(directory + '/messages/' + safeID(row.id) + '.json', {
      signature: row.signature,
      content: row.content,
      relayed: !!row.relayed,
    })
    messages.set(row.id, row)
  }
  async function accept(signature, content, local = false) {
    const row = await verify(signature, content)
    if (messages.has(row.id)) return messages.get(row.id)
    if (messages.size >= 10000) {
      throw new Error('Timeline storage limit reached')
    }
    acceptShape(row)
    if (local && row.parsed.andfs && !media.has(row.parsed.andfs)) {
      throw new Error('Upload the attachment before publishing')
    }
    if (
      row.parsed.andfs &&
      (row.parsed.type !== (row.parsed.mime || '').split('/')[0] ||
        !MIME.has(row.parsed.mime))
    ) throw new Error('Unsupported attachment MIME type')
    if (row.parsed.andfs && media.has(row.parsed.andfs)) {
      const attachment = media.get(row.parsed.andfs)
      if (
        attachment.media_size !== row.parsed.media_size ||
        attachment.mime !== row.parsed.mime
      ) throw new Error('Attachment metadata does not match uploaded media')
    }
    await persist(row)
    return row
  }
  // Serialize mutations: duplicate publishes, quota checks and atomic indexes share one order.
  let queue = Promise.resolve()
  function mutate(fn) {
    const result = queue.then(fn)
    queue = result.catch(() => {})
    return result
  }
  const hits = new Map()
  function limit(author, kind, maximum) {
    const key = kind + author, now = Date.now()
    if (hits.size > 2000) {
      for (const [k, v] of hits) if (now - v.start > 3600000) hits.delete(k)
    }
    const entry = hits.get(key) || { start: now, count: 0 }
    if (now - entry.start > 3600000) {
      entry.start = now
      entry.count = 0
    }
    if (++entry.count > maximum) {
      throw new Error('Hourly limit reached; try again later')
    }
    hits.set(key, entry)
  }
  async function gossip(value) {
    if (!config.relay) throw new Error('Wiredove relay is disabled')
    const response = await relayFetch(config.relay + '/gossip', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: value,
      signal: AbortSignal.timeout(10000),
    })
    if (!response.ok) {
      throw new Error('Wiredove relay returned ' + response.status)
    }
    const result = JSON.parse(
      new TextDecoder().decode(
        await readLimited(response.body, 4 * 1024 * 1024),
      ),
    )
    return Array.isArray(result.messages)
      ? result.messages.filter((x) => typeof x === 'string')
      : []
  }
  async function remoteContent(proof) {
    const values = await gossip(proof.contentHash)
    for (const value of values) {
      if (await an.hash(value) === proof.contentHash) return value
    }
    throw new Error('Wiredove content is not available')
  }
  async function remoteRow(id) {
    const values = await gossip(id)
    for (const signature of values) {
      try {
        const proof = await open(signature)
        if (proof.author !== id && await an.hash(signature) !== id) continue
        return await verify(signature, await remoteContent(proof))
      } catch { /* Not the requested valid message. */ }
    }
    return null
  }
  async function relay(row) {
    if (row.relayed) return true
    await gossip(row.content)
    await gossip(row.signature)
    // Confirm retrieval, rather than interpreting an HTTP 200 as persistence.
    const values = await gossip(row.id)
    if (!values.includes(row.signature)) {
      throw new Error('Wiredove has not confirmed receipt')
    }
    if (!(await gossip(row.contentHash)).includes(row.content)) {
      throw new Error('Wiredove has not confirmed the post content')
    }
    row.relayed = true
    await persist(row)
    return true
  }
  let syncAt = 0, cursor = 0
  const syncSeen = new Set()
  try {
    const state = JSON.parse(
      await Deno.readTextFile(directory + '/cursor.json'),
    )
    cursor = state.since || 0
    for (const id of state.seen || []) syncSeen.add(id)
  } catch { /* First sync. */ }
  async function sync() {
    if (Date.now() - syncAt < 15000) {
      return { added: 0, message: 'Wait a few seconds before syncing again.' }
    }
    syncAt = Date.now()
    let added = 0
    async function ingest(row, depth = 0) {
      if (!row || messages.has(row.id) || depth > 12) return
      if (row.parsed.reply && !messages.has(row.parsed.reply)) {
        await ingest(await remoteRow(row.parsed.reply), depth + 1)
      }
      try {
        await accept(row.signature, row.content)
        added++
      } catch { /* Unrelated or unsupported event. */ }
    }
    let row = await remoteRow(config.owner)
    const visited = new Set()
    for (let count = 0; row && count < 30 && !visited.has(row.id); count++) {
      visited.add(row.id)
      await ingest(row)
      row = row.parsed.previous ? await remoteRow(row.parsed.previous) : null
    }
    const response = await relayFetch(
      config.relay + '/gossip/poll?since=' + cursor,
      { signal: AbortSignal.timeout(10000) },
    )
    if (!response.ok) throw new Error('Wiredove reply sync failed')
    const polled = JSON.parse(
      new TextDecoder().decode(
        await readLimited(response.body, 4 * 1024 * 1024),
      ),
    )
    const values = Array.isArray(polled.messages) ? polled.messages : []
    const contentByHash = new Map()
    for (const value of values) {
      if (typeof value === 'string' && encoder.encode(value).length <= 65536) {
        contentByHash.set(await an.hash(value), value)
      }
    }
    let requests = 0, complete = true
    for (const signature of values) {
      let proof
      try {
        proof = await open(signature)
      } catch {
        continue
      }
      const messageID = await an.hash(signature)
      if (messages.has(messageID) || syncSeen.has(messageID)) continue
      let content = contentByHash.get(proof.contentHash)
      if (!content) {
        if (requests++ >= 50) {
          complete = false
          break
        }
        try {
          content = await remoteContent(proof)
        } catch {
          complete = false
          continue
        }
      }
      const incoming = await verify(signature, content).catch(() => null)
      // Only retrieve ancestors for owner posts or replies explicitly addressed to known authors.
      if (
        incoming &&
        (incoming.author === config.owner ||
          incoming.parsed.replyto === config.owner ||
          messages.has(incoming.parsed.reply))
      ) await ingest(incoming)
      syncSeen.add(messageID)
    }
    if (complete && Number.isFinite(polled.nextSince)) {
      cursor = Math.max(cursor, polled.nextSince)
      syncSeen.clear()
    }
    await atomic(directory + '/cursor.json', {
      since: cursor,
      seen: [...syncSeen],
    })
    return {
      added,
      message: complete
        ? 'Synced from Wiredove.'
        : 'Partial sync; more messages remain. Sync again to continue.',
    }
  }
  async function upload(request) {
    const signature = request.headers.get('X-ANProto-Signature')
    const authorization = request.headers.get('X-ANProto-Content')
    if (!authorization || authorization.length > 8192) {
      throw new Error('Missing upload authorization')
    }
    const proof = await open(signature)
    if (
      Math.abs(Date.now() - proof.timestamp) > 300000 ||
      await an.hash(authorization) !== proof.contentHash
    ) throw new Error('Invalid or expired upload authorization')
    const meta = JSON.parse(authorization)
    if (
      meta.action !== 'andfs-upload-v1' || !isAndFS(meta.andfs) ||
      !MIME.has(meta.mime) || !Number.isSafeInteger(meta.media_size) ||
      meta.media_size < 1 || meta.media_size > config.maxMediaBytes
    ) throw new Error('Unsupported media or size; maximum is 32 MiB')
    if (!allowed(proof.author, meta.reply, meta.replyto)) {
      throw new Error(
        'Choose a conversation before uploading a reply attachment',
      )
    }
    if (media.has(meta.andfs)) return json(media.get(meta.andfs))
    limit(proof.author, 'media', 20)
    const used = [...media.values()].reduce((sum, m) => sum + m.media_size, 0)
    if (used + meta.media_size > config.mediaQuotaBytes) {
      throw new Error('Media storage quota reached')
    }
    const bytes = await readLimited(request.body, meta.media_size)
    if (bytes.length !== meta.media_size) {
      throw new Error('Incomplete media upload')
    }
    const staging = createAndFS({ store: memoryStore() })
    const staged = await staging.add(bytes)
    if (staged.manifestHash !== meta.andfs) {
      throw new Error('Media bytes do not match signed AndFS manifest')
    }
    await files.add(bytes)
    const saved = {
      andfs: meta.andfs,
      mime: meta.mime,
      media_size: meta.media_size,
    }
    await atomic(directory + '/media/' + meta.andfs + '.json', saved)
    media.set(meta.andfs, saved)
    return json(saved, 201)
  }
  async function serveMedia(request, id) {
    const meta = media.get(id)
    if (!meta) return json({ error: 'Media not found' }, 404)
    const manifest = await files.manifest(id)
    let range
    try {
      range = byteRange(request.headers.get('Range'), manifest.size)
    } catch {
      return new Response(null, {
        status: 416,
        headers: { 'Content-Range': 'bytes */' + manifest.size },
      })
    }
    const headers = {
      'Content-Type': meta.mime,
      'Content-Length': String(range.end - range.start),
      'Accept-Ranges': 'bytes',
      'X-Content-Type-Options': 'nosniff',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=31536000, immutable',
    }
    if (range.status === 206) {
      headers['Content-Range'] = `bytes ${range.start}-${
        range.end - 1
      }/${manifest.size}`
    }
    return new Response(
      request.method === 'HEAD' ? null : files.read(id, range),
      { status: range.status, headers },
    )
  }
  const assets = new Set([
    'client.js',
    'protocol.js',
    'vendor/yaml.js',
    'vendor/anproto/an.js',
    'vendor/anproto/lib/base64.js',
    'vendor/anproto/lib/nacl-fast-es.js',
    'vendor/andfs/andfs.js',
    'vendor/andfs/stores.js',
  ])
  return {
    async fetch(request) {
      const url = new URL(request.url),
        path = url.pathname.replace(/^\/timeline\/?/, '')
      try {
        if (
          request.method === 'GET' && (path === '' || path === 'index.html')
        ) {
          return new Response(
            await Deno.readFile(new URL('./index.html', import.meta.url)),
            { headers: { 'Content-Type': 'text/html; charset=utf-8' } },
          )
        }
        if (request.method === 'GET' && assets.has(path)) {
          return new Response(
            await Deno.readFile(new URL('./' + path, import.meta.url)),
            { headers: { 'Content-Type': 'text/javascript; charset=utf-8' } },
          )
        }
        if (request.method === 'GET' && path === 'api/config') {
          return json({
            owner: config.owner,
            maxMediaBytes: config.maxMediaBytes,
            relay: config.relay,
          })
        }
        if (request.method === 'GET' && path === 'api/posts') {
          return json({
            posts: [...messages.values()].sort((a, b) =>
              b.timestamp - a.timestamp
            ),
          })
        }
        if (request.method === 'GET' && path === 'api/export') {
          return json({
            format: 'evbogue-wiredove-v1',
            posts: [...messages.values()].map(({ signature, content }) => ({
              signature,
              content,
            })),
            media: [...media.values()],
          })
        }
        if (request.method === 'GET' && path === 'api/latest') {
          const author = url.searchParams.get('author')
          if (!isHash(author)) throw new Error('Invalid author')
          let latest = [...messages.values()].filter((row) =>
            row.author === author
          ).sort((a, b) =>
            b.timestamp - a.timestamp
          )[0]
          let remoteAvailable = !config.relay
          if (config.relay) {
            try {
              const remote = await remoteRow(author)
              remoteAvailable = true
              if (remote && (!latest || remote.timestamp > latest.timestamp)) {
                latest = remote
              }
            } catch { /* Report degraded continuity to the composer. */ }
          }
          return json({
            latest: latest
              ? {
                id: latest.id,
                signature: latest.signature,
                content: latest.content,
              }
              : null,
            remoteAvailable,
          })
        }
        if (
          ['GET', 'HEAD'].includes(request.method) && path.startsWith('media/')
        ) return await serveMedia(request, path.slice(6))
        if (
          ['GET', 'HEAD'].includes(request.method) && path.startsWith('blobs/')
        ) {
          const id = path.slice(6)
          if (!isAndFS(id)) throw new Error('Invalid block hash')
          const bytes = await files.getBlock(id, { maxBytes: MAX_MANIFEST })
          return new Response(request.method === 'HEAD' ? null : bytes, {
            headers: {
              'Content-Type': 'application/octet-stream',
              'Content-Length': String(bytes.length),
              'Access-Control-Allow-Origin': '*',
              'X-Content-Type-Options': 'nosniff',
            },
          })
        }
        if (request.method === 'POST') {
          const origin = request.headers.get('Origin')
          if (origin && origin !== url.origin) {
            return json({ error: 'Cross-origin writes are not accepted' }, 403)
          }
          if (path === 'api/media') return await mutate(() => upload(request))
          if (path === 'api/sync') {
            return await mutate(async () => json(await sync()))
          }
          if (path === 'api/posts' || path === 'api/import') {
            const data = JSON.parse(
              new TextDecoder().decode(
                await readLimited(
                  request.body,
                  path === 'api/import' ? 4 * 1024 * 1024 : 131072,
                ),
              ),
            )
            return await mutate(async () => {
              if (path === 'api/import') {
                if (!Array.isArray(data.posts) || data.posts.length > 500) {
                  throw new Error('Import at most 500 posts at a time')
                }
                let pending = [...data.posts], imported = 0
                for (let pass = 0; pass < 20 && pending.length; pass++) {
                  const next = []
                  for (const row of pending) {
                    try {
                      await accept(row.signature, row.content)
                      imported++
                    } catch {
                      next.push(row)
                    }
                  }
                  if (next.length === pending.length) break
                  pending = next
                }
                return json({
                  imported,
                  rejected: data.posts.length - imported,
                })
              }
              const validated = await verify(data.signature, data.content)
              if (!messages.has(validated.id)) {
                limit(validated.author, 'posts', 60)
              }
              const row = await accept(data.signature, data.content, true)
              let relayError = null
              if (config.relay) {
                try {
                  await relay(row)
                } catch (error) {
                  relayError = error.message
                }
              }
              return json({
                id: row.id,
                saved: true,
                relayed: !!row.relayed,
                relayError,
              }, 201)
            })
          }
        }
        return json({ error: 'Not found' }, 404)
      } catch (error) {
        return json({ error: error.message }, 400)
      }
    },
  }
}
