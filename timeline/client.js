import { an, compose, identity, verify } from './protocol.js'
import { createAndFS } from './vendor/andfs/andfs.js'
import { memoryStore } from './vendor/andfs/stores.js'

const $ = (id) => document.getElementById(id)
const api = '/timeline/api/'
let keypair = '', author = '', config, posts = [], busy = false
let pendingPosts = null, widget
const status = (message) => {
  $('status').textContent = message
  $('status').hidden = !message
}
async function request(path, options = {}) {
  const response = await fetch(api + path, { cache: 'no-store', ...options })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || 'Request failed')
  return data
}
function download(value, filename, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([value], { type }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
function showSettings(open) {
  $('settings').hidden = !open
  $('settings-toggle').setAttribute('aria-expanded', String(open))
  if (open) $('settings').scrollIntoView({ block: 'start' })
}
function updateIdentity() {
  $('identity-label').textContent = author
    ? 'Signed in as ' + author
    : 'Reading without signing in.'
  $('backup').disabled = $('logout').disabled = !author
}
async function useIdentity(value) {
  author = await identity(value)
  keypair = value
  if ($('remember').checked) localStorage.setItem('evbogue.timeline.key', value)
  else localStorage.removeItem('evbogue.timeline.key')
  $('keypair').value = ''
  $('name').value = localStorage.getItem('evbogue.timeline.name.' + author) || ''
  updateIdentity()
}
function render() {
  widget.posts = posts
}
function revealHash() {
  let id
  try { id = decodeURIComponent(location.hash.slice(1)) } catch { return }
  if (id && posts.some((post) => post.id === id)) {
    widget.navigate({ type: 'post', id })
    widget.scrollIntoView({ block: 'start' })
  }
}
async function fetchPosts() {
  const data = await request('posts')
  return await Promise.all(data.posts.map(async (row) => ({
    ...await verify(row.signature, row.content),
    relayed: row.relayed === true,
  })))
}
async function refresh() {
  posts = await fetchPosts()
  pendingPosts = null
  $('new-updates').hidden = true
  render()
  revealHash()
}
let checking = false
async function checkUpdates() {
  if (checking || document.hidden || busy) return
  checking = true
  try {
    if (config.relay) await request('sync', { method: 'POST' }).catch(() => {})
    const incoming = await fetchPosts()
    const known = new Set(posts.map((row) => row.id))
    const count = incoming.filter((row) => !known.has(row.id)).length
    if (count) {
      pendingPosts = incoming
      $('new-updates').textContent = count +
        (count === 1 ? ' new update' : ' new updates')
      $('new-updates').hidden = false
    }
  } catch {
    // Keep the current reading position and retry on the next check.
  } finally {
    checking = false
  }
}
async function run(fn) {
  try { await fn() } catch (error) { status(error.message) }
}
async function publishDraft({ body, file, replyTo }) {
  if (busy) throw new Error('A message is already publishing')
  busy = true
  const signingKey = keypair, signingAuthor = author, target = replyTo
  try {
    if (!signingAuthor) {
      showSettings(true)
      $('identity-panel').open = true
      throw new Error('Import or create an identity in Settings first')
    }
    if (!target && signingAuthor !== config.owner) {
      throw new Error('Only the timeline owner can write a new post here')
    }
    body = body.trim()
    const meta = { name: $('name').value.trim() || signingAuthor.slice(0, 12) }
    if (!body && !file) throw new Error('Write something or attach a file')
    if (target) {
      meta.reply = target.id
      meta.replyto = target.author
    }
    status('Checking your latest message…')
    const latest = await request('latest?author=' + encodeURIComponent(signingAuthor))
    if (!latest.remoteAvailable) {
      throw new Error('Wiredove is unavailable. Your draft is kept; retry when it is reachable so your feed history stays connected.')
    }
    if (latest.latest) {
      const previous = await verify(latest.latest.signature, latest.latest.content)
      if (previous.author !== signingAuthor) {
        throw new Error('Latest message has the wrong author')
      }
      meta.previous = previous.id
      if (previous.parsed.image) meta.image = previous.parsed.image
    }
    if (file) {
      if (!file.size || file.size > config.maxMediaBytes) {
        throw new Error('Choose a nonempty attachment no larger than 32 MiB')
      }
      status('Preparing AndFS attachment…')
      const added = await createAndFS({ store: memoryStore() }).add(file)
      const mime = file.type.split(';')[0].toLowerCase()
      const authorization = JSON.stringify({
        action: 'andfs-upload-v1',
        andfs: added.manifestHash,
        mime,
        media_size: file.size,
        reply: meta.reply,
        replyto: meta.replyto,
      })
      const signature = await an.sign(await an.hash(authorization), signingKey)
      status('Uploading attachment…')
      await request('media', {
        method: 'POST',
        headers: {
          'X-ANProto-Signature': signature,
          'X-ANProto-Content': authorization,
        },
        body: file,
      })
      const mediaURL = location.origin + '/timeline/media/' + added.manifestHash
      Object.assign(meta, {
        type: mime.split('/')[0],
        andfs: added.manifestHash,
        mime,
        media_name: file.name,
        media_size: file.size,
        media_url: mediaURL,
        media_source: location.origin + '/timeline',
      })
      body += '\n\n' + mediaURL
    }
    status('Signing and publishing…')
    const row = await compose(signingKey, body, meta)
    const result = await request('posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ signature: row.signature, content: row.content }),
    })
    await refresh()
    widget.navigate(target ? { type: 'post', id: target.id } : { type: 'feed' })
    status(result.relayed
      ? 'Published here and confirmed by Wiredove.'
      : config.relay
      ? 'Saved here; Wiredove delivery remains pending: ' +
        (result.relayError || 'unconfirmed')
      : 'Saved on this site.')
  } finally {
    busy = false
  }
}
$('new-updates').onclick = () => {
  if (!pendingPosts) return
  posts = pendingPosts
  pendingPosts = null
  $('new-updates').hidden = true
  render()
  widget.scrollIntoView({ block: 'start' })
}
$('settings-toggle').onclick = () => showSettings($('settings').hidden)
$('identity-form').onsubmit = (event) => {
  event.preventDefault()
  run(() => useIdentity($('keypair').value.trim()))
}
$('generate').onclick = () => run(async () => {
  await useIdentity(await an.gen())
  status('Identity created. Download a backup before closing this page.')
  $('identity-panel').open = true
})
$('backup').onclick = () => download(keypair, 'wiredove-identity.txt', 'text/plain')
$('logout').onclick = () => {
  keypair = ''
  author = ''
  localStorage.removeItem('evbogue.timeline.key')
  updateIdentity()
  status('Identity forgotten on this page.')
}
$('remember').onchange = () => {
  if (keypair && $('remember').checked) {
    localStorage.setItem('evbogue.timeline.key', keypair)
  } else localStorage.removeItem('evbogue.timeline.key')
}
$('name').onchange = () => {
  if (author) localStorage.setItem('evbogue.timeline.name.' + author, $('name').value)
}
$('refresh').onclick = () => run(async () => {
  await refresh()
  status('Posts refreshed.')
})
$('sync').onclick = () => run(async () => {
  $('sync').disabled = true
  status('Syncing from Wiredove…')
  try {
    const result = await request('sync', { method: 'POST' })
    await refresh()
    status(result.message + ' ' + result.added + ' posts added.')
  } finally {
    $('sync').disabled = false
  }
})
$('import-button').onclick = () => run(async () => {
  const file = $('import-posts').files[0]
  if (!file || file.size > 4 * 1024 * 1024) {
    throw new Error('Choose an export smaller than 4 MiB')
  }
  const result = await request('import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: await file.text(),
  })
  await refresh()
  status(result.imported + ' posts imported; ' + result.rejected + ' rejected.')
})
globalThis.addEventListener('hashchange', revealHash)
await run(async () => {
  config = await request('config')
  const { defineWiredoveElements } = await import('https://wiredove.net/client/ui.js?v=add176d')
  defineWiredoveElements()
  widget = $('widget')
  widget.onPublish = publishDraft
  widget.addEventListener('wiredove-routechange', (event) => {
    if (event.detail.type === 'post') {
      history.replaceState(null, '', '#' + encodeURIComponent(event.detail.id))
    } else if (location.hash) history.replaceState(null, '', location.pathname)
  })
  $('owner-identity').textContent = 'Owner identity: ' + config.owner
  const saved = localStorage.getItem('evbogue.timeline.key')
  if (saved) {
    $('remember').checked = true
    await useIdentity(saved)
  }
  updateIdentity()
  await refresh()
  if (config.relay && !posts.length) {
    status('Syncing posts from Wiredove…')
    try {
      await request('sync', { method: 'POST' })
      await refresh()
      status('')
    } catch (error) {
      status('Wiredove sync unavailable: ' + error.message)
    }
  }
  if (posts.length || !config.relay) status('')
  setInterval(checkUpdates, 30000)
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) void checkUpdates()
  })
})
