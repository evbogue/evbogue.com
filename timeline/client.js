import { an, compose, identity, verify } from './protocol.js'
import { createAndFS } from './vendor/andfs/andfs.js'
import { memoryStore } from './vendor/andfs/stores.js'

const $ = (id) => document.getElementById(id)
const api = '/timeline/api/'
let keypair = '',
  author = '',
  config,
  posts = [],
  reply = null,
  pageSize = 20,
  busy = false,
  composerOpen = false,
  pendingPosts = null,
  lastVisit = null
const status = (message) => {
  $('status').textContent = message
  $('status').hidden = !message
}
const element = (tag, text) => {
  const node = document.createElement(tag)
  if (text !== undefined) node.textContent = text
  return node
}
function breakable(node, text) {
  node.replaceChildren()
  for (const token of String(text).split(/(\s+)/)) {
    for (const chunk of token.match(/.{1,24}/g) || [token]) {
      node.append(document.createTextNode(chunk), element('wbr'))
    }
  }
  return node
}
async function request(path, options = {}) {
  const response = await fetch(api + path, { cache: 'no-store', ...options })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || 'Request failed')
  return data
}
function download(value, filename, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([value], { type }))
  const link = element('a')
  link.href = url
  link.download = filename
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
function safeURL(value) {
  try {
    const url = new URL(value)
    return ['http:', 'https:'].includes(url.protocol) ? url.href : null
  } catch {
    return null
  }
}
function updateIdentity() {
  $('identity-label').replaceChildren(
    document.createTextNode(
      author ? 'Signed in as ' : 'Reading without signing in.',
    ),
  )
  if (author) {
    for (const chunk of author.match(/.{1,12}/g)) {
      $('identity-label').append(document.createTextNode(chunk), element('wbr'))
    }
  }
  $('backup').disabled = $('logout').disabled = !author
  $('write-post').hidden = author !== config.owner
  $('write-post').setAttribute('aria-expanded', String(composerOpen))
  $('composer-section').hidden = !author || !composerOpen ||
    (author !== config.owner && !reply)
  $('compose-label').textContent = reply ? 'Write a reply' : 'Write a post'
  $('reply-context').textContent = reply
    ? 'Replying to ' + (reply.parsed.name || reply.author) + ': ' +
      reply.parsed.body.slice(0, 100)
    : ''
  $('publish').textContent = reply ? 'Reply' : 'Post'
}
async function useIdentity(value) {
  author = await identity(value)
  keypair = value
  if ($('remember').checked) {
    localStorage.setItem('evbogue.timeline.key', keypair)
  } else localStorage.removeItem('evbogue.timeline.key')
  $('keypair').value = ''
  $('name').value = localStorage.getItem('evbogue.timeline.name.' + author) ||
    ''
  if (reply) composerOpen = true
  updateIdentity()
  render()
}
function chooseReply(row) {
  reply = row
  if (!author) {
    showSettings(true)
    $('identity-panel').open = true
    $('keypair').focus()
    status('Import or create an identity to reply.')
    return
  }
  reply = row
  composerOpen = true
  updateIdentity()
  $('body').focus()
  $('composer-section').scrollIntoView()
}
function relativeTime(timestamp) {
  const elapsed = Math.max(0, Date.now() - timestamp)
  if (elapsed < 60000) return 'Just now'
  if (elapsed < 3600000) {
    const n = Math.floor(elapsed / 60000)
    return n + (n === 1 ? ' minute ago' : ' minutes ago')
  }
  if (elapsed < 86400000) {
    const n = Math.floor(elapsed / 3600000)
    return n + (n === 1 ? ' hour ago' : ' hours ago')
  }
  const date = new Date(timestamp), yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    ...(date.getFullYear() !== new Date().getFullYear()
      ? { year: 'numeric' }
      : {}),
  })
}
function showSettings(open) {
  $('settings').hidden = !open
  $('settings-toggle').setAttribute('aria-expanded', String(open))
  if (open) $('settings').scrollIntoView({ block: 'start' })
}
function render() {
  const expanded = new Set(
    [...$('feed').querySelectorAll('details[open]')].map((node) => node.id),
  )
  $('feed').replaceChildren()
  const roots = posts.filter((row) =>
    row.author === config.owner && !row.parsed.reply
  )
  const byParent = new Map()
  for (const row of posts) {
    if (row.parsed.reply) {
      const list = byParent.get(row.parsed.reply) || []
      list.push(row)
      byParent.set(row.parsed.reply, list)
    }
  }
  function article(row, depth = 0) {
    const node = element('article')
    node.id = row.id
    const heading = element('p')
    heading.className = 'timeline-post-meta'
    const name = breakable(
      element('a'),
      row.author === config.owner
        ? 'Ev Bogue'
        : row.parsed.name || row.author.slice(0, 12),
    )
    name.href = 'https://wiredove.net/#' + encodeURIComponent(row.author)
    name.title = row.author
    const time = element('a', relativeTime(row.timestamp))
    time.dataset.timestamp = row.timestamp
    time.title = new Date(row.timestamp).toLocaleString()
    time.setAttribute('aria-label', time.textContent + ', ' + time.title)
    time.href = '/timeline/#' + encodeURIComponent(row.id)
    heading.append(name, ' · ', time)
    const body = element('div')
    body.className = 'timeline-post-body'
    // Text nodes preserve untrusted content; only explicit HTTP(S) links become anchors.
    for (const line of (row.parsed.body || '').split('\n')) {
      if (row.parsed.andfs && line.trim() === row.parsed.media_url) continue
      if (!line.trim()) continue
      const paragraph = element('p')
      for (const part of line.split(/(https?:\/\/[^\s)<>]+)/g)) {
        const url = /^https?:\/\//.test(part) ? safeURL(part) : null
        if (url) {
          const link = breakable(element('a'), part)
          link.href = url
          link.rel = 'noreferrer'
          paragraph.append(link)
        } else paragraph.append(breakable(element('span'), part))
      }
      body.append(paragraph)
    }
    node.append(heading, body)
    if (row.parsed.andfs) {
      const source = safeURL(row.parsed.media_url) ||
        location.origin + '/timeline/media/' + row.parsed.andfs
      const player = element(
        row.parsed.type === 'image' ? 'img' : row.parsed.type,
      )
      if (row.parsed.type === 'image') {
        player.alt = row.parsed.media_name || 'Attached image'
        player.width = 320
      } else {
        player.controls = true
        player.preload = row.parsed.type === 'video' ? 'metadata' : 'none'
        if (row.parsed.type === 'video') {
          player.width = 320
          player.playsInline = true
        }
      }
      player.src = source
      const link = element('a', row.parsed.media_name || 'Download attachment')
      link.href = source
      const attachment = element('p')
      attachment.className = 'timeline-attachment'
      attachment.append(link)
      node.append(player, attachment)
    } else if (row.parsed.blob) {
      const link = element('a', 'Open legacy media in Wiredove')
      link.href = 'https://wiredove.net/#' + encodeURIComponent(row.id)
      node.append(link)
    }
    const button = element('button', 'Reply')
    button.onclick = () => chooseReply(row)
    const actions = element('div')
    actions.className = 'timeline-post-actions'
    actions.append(button)
    node.append(actions)
    const raw = element('details'),
      summary = element('summary', 'Details'),
      pre = element('textarea')
    pre.value = JSON.stringify(
      { signature: row.signature, content: row.content },
      null,
      2,
    )
    pre.readOnly = true
    pre.rows = 8
    pre.cols = 35
    pre.setAttribute('aria-label', 'Signed message and content')
    raw.id = 'details-' + row.id
    raw.open = expanded.has(raw.id)
    raw.append(summary, element('p', 'Author: ' + row.author), pre)
    if (row.parsed.andfs) raw.append(element('p', 'AndFS: ' + row.parsed.andfs))
    actions.append(raw)
    if (config.relay && !row.relayed && row.author === author) {
      const retry = element('button', 'Send to Wiredove')
      retry.onclick = () =>
        run(async () => {
          retry.disabled = true
          try {
            const result = await request('posts', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                signature: row.signature,
                content: row.content,
              }),
            })
            status(
              result.relayed
                ? 'Confirmed by Wiredove.'
                : 'Saved here; Wiredove delivery remains pending.',
            )
            await refresh()
          } finally {
            retry.disabled = false
          }
        })
      raw.append(retry)
    }
    const children = (byParent.get(row.id) || []).sort((a, b) =>
      a.timestamp - b.timestamp
    )
    if (children.length && depth < 20) {
      const details = element('details')
      details.id = 'replies-' + row.id
      details.open = expanded.has(details.id)
      const count = element(
        'button',
        children.length + (children.length === 1 ? ' reply' : ' replies'),
      )
      count.setAttribute('aria-expanded', String(details.open))
      count.setAttribute('aria-controls', details.id)
      count.onclick = () => {
        details.open = !details.open
      }
      details.ontoggle = () =>
        count.setAttribute('aria-expanded', String(details.open))
      const summary = element('summary', 'Replies')
      summary.className = 'timeline-reply-summary'
      details.append(summary)
      actions.insertBefore(count, raw)
      for (const child of children) details.append(article(child, depth + 1))
      node.append(details)
    }
    return node
  }
  const hasNew = lastVisit && roots.some((row) => row.timestamp > lastVisit)
  let dividerShown = false
  if (hasNew) $('feed').append(element('p', 'New since your last visit'))
  for (const row of roots.slice(0, pageSize)) {
    if (hasNew && !dividerShown && row.timestamp <= lastVisit) {
      const divider = element('p', 'Last visit')
      divider.className = 'timeline-last-visit'
      $('feed').append(divider)
      dividerShown = true
    }
    $('feed').append(article(row))
  }
  if (!roots.length) $('feed').append(element('p', 'No posts yet.'))
  $('older').hidden = roots.length <= pageSize
}
function revealHash() {
  let id
  try {
    id = decodeURIComponent(location.hash.slice(1))
  } catch {
    return
  }
  if (!id) return
  if (!document.getElementById(id)) {
    pageSize = posts.length
    render()
  }
  const target = document.getElementById(id)
  if (target) {
    let parent = target.parentElement
    while (parent) {
      if (parent.tagName === 'DETAILS') parent.open = true
      parent = parent.parentElement
    }
    target.scrollIntoView()
  }
}
async function fetchPosts() {
  const data = await request('posts')
  return await Promise.all(
    data.posts.map(async (row) => ({
      ...await verify(row.signature, row.content),
      relayed: row.relayed === true,
    })),
  )
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
    const incoming = await fetchPosts(),
      known = new Set(posts.map((row) => row.id))
    const count = incoming.filter((row) => !known.has(row.id)).length
    if (count) {
      pendingPosts = incoming
      $('new-updates').textContent = count +
        (count === 1 ? ' new update' : ' new updates')
      $('new-updates').hidden = false
    }
  } catch {
    /* Keep the current reading position and retry on the next check. */
  } finally {
    checking = false
  }
}
$('new-updates').onclick = () => {
  if (!pendingPosts) return
  posts = pendingPosts
  pendingPosts = null
  $('new-updates').hidden = true
  render()
  localStorage.setItem(
    'evbogue.timeline.lastVisit.' + config.owner,
    String(Date.now()),
  )
  $('feed').scrollIntoView({ block: 'start' })
}
$('write-post').onclick = () => {
  reply = null
  composerOpen = !composerOpen
  updateIdentity()
  if (composerOpen) $('body').focus()
}
$('settings-toggle').onclick = () => showSettings($('settings').hidden)
async function run(fn) {
  try {
    await fn()
  } catch (error) {
    status(error.message)
  }
}
$('identity-form').onsubmit = (event) => {
  event.preventDefault()
  run(() => useIdentity($('keypair').value.trim()))
}
$('generate').onclick = () =>
  run(async () => {
    await useIdentity(await an.gen())
    status('Identity created. Download a backup before closing this page.')
    $('identity-panel').open = true
  })
$('backup').onclick = () =>
  download(keypair, 'wiredove-identity.txt', 'text/plain')
$('logout').onclick = () => {
  keypair = ''
  author = ''
  reply = null
  composerOpen = false
  localStorage.removeItem('evbogue.timeline.key')
  updateIdentity()
  render()
  status('Identity forgotten on this page.')
}
$('remember').onchange = () => {
  if (keypair && $('remember').checked) {
    localStorage.setItem('evbogue.timeline.key', keypair)
  } else localStorage.removeItem('evbogue.timeline.key')
}
$('name').onchange = () => {
  if (author) {
    localStorage.setItem('evbogue.timeline.name.' + author, $('name').value)
  }
}
$('cancel-reply').onclick = () => {
  reply = null
  composerOpen = false
  updateIdentity()
}
$('older').onclick = () => {
  pageSize += 20
  render()
}
$('refresh').onclick = () =>
  run(async () => {
    await refresh()
    status('Posts refreshed.')
  })
$('sync').onclick = () =>
  run(async () => {
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
$('import-button').onclick = () =>
  run(async () => {
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
    status(
      result.imported + ' posts imported; ' + result.rejected + ' rejected.',
    )
  })
$('composer').onsubmit = (event) => {
  event.preventDefault()
  if (busy) return
  run(async () => {
    busy = true
    $('publish').disabled = true
    // Freeze the identity and target for this entire asynchronous publish.
    const signingKey = keypair, signingAuthor = author, target = reply
    try {
      if (!signingAuthor) throw new Error('Import or create an identity first')
      let body = $('body').value.trim()
      const meta = {
        name: $('name').value.trim() || signingAuthor.slice(0, 12),
      }
      const file = $('media').files[0]
      if (!body && !file) throw new Error('Write something or attach a file')
      if (target) {
        meta.reply = target.id
        meta.replyto = target.author
      }
      status('Checking your latest message…')
      const latest = await request(
        'latest?author=' + encodeURIComponent(signingAuthor),
      )
      if (!latest.remoteAvailable) {
        throw new Error(
          'Wiredove is unavailable. Your draft is kept; retry when it is reachable so your feed history stays connected.',
        )
      }
      if (latest.latest) {
        const previous = await verify(
          latest.latest.signature,
          latest.latest.content,
        )
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
        const signature = await an.sign(
          await an.hash(authorization),
          signingKey,
        )
        status('Uploading attachment…')
        await request('media', {
          method: 'POST',
          headers: {
            'X-ANProto-Signature': signature,
            'X-ANProto-Content': authorization,
          },
          body: file,
        })
        const mediaURL = location.origin + '/timeline/media/' +
          added.manifestHash
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
        body: JSON.stringify({
          signature: row.signature,
          content: row.content,
        }),
      })
      $('body').value = ''
      $('media').value = ''
      reply = null
      composerOpen = false
      updateIdentity()
      await refresh()
      status(
        result.relayed
          ? 'Published here and confirmed by Wiredove.'
          : config.relay
          ? 'Saved here. Use Send to Wiredove to retry delivery: ' +
            (result.relayError || 'unconfirmed')
          : 'Saved on this site.',
      )
    } finally {
      busy = false
      $('publish').disabled = false
    }
  })
}
globalThis.addEventListener('hashchange', revealHash)
await run(async () => {
  config = await request('config')
  lastVisit = Number(
    localStorage.getItem('evbogue.timeline.lastVisit.' + config.owner),
  ) || null
  $('media-limit').textContent = 'Up to ' + config.maxMediaBytes / 1024 / 1024 +
    ' MiB per attachment.'
  const saved = localStorage.getItem('evbogue.timeline.key')
  if (saved) {
    $('remember').checked = true
    await useIdentity(saved)
  }
  updateIdentity()
  await refresh()
  status('')
  localStorage.setItem(
    'evbogue.timeline.lastVisit.' + config.owner,
    String(Date.now()),
  )
  setInterval(checkUpdates, 30000)
  setInterval(() => {
    for (const time of $('feed').querySelectorAll('[data-timestamp]')) {
      time.textContent = relativeTime(Number(time.dataset.timestamp))
    }
  }, 60000)
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) void checkUpdates()
  })
})
