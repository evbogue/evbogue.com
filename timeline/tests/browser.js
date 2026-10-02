// Local-only widget integration test. Disposable identities and data; no public relay.
import { chromium } from 'playwright'
import { Buffer } from 'node:buffer'
import { strict as assert } from 'node:assert'
import { an, compose } from '../protocol.js'
import { createTimeline } from '../server.js'

const directory = await Deno.makeTempDir()
const key = await an.gen()
const app = await createTimeline({
  directory,
  config: {
    owner: key.slice(0, 44), relay: '', maxMediaBytes: 33554432,
    mediaQuotaBytes: 1073741824,
  },
})
const server = Deno.serve(
  { hostname: '127.0.0.1', port: 0, onListen() {} },
  (request) => {
    const url = new URL(request.url)
    if (url.pathname === '/timeline') url.pathname = '/timeline/'
    return app.fetch(new Request(url, request))
  },
)
const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const context = await browser.newContext({ viewport: { width: 1100, height: 850 } })
  const page = await context.newPage(), errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('http://127.0.0.1:' + server.addr.port + '/timeline/')
  const widget = page.locator('wiredove-widget')
  await widget.getByText('No posts yet.', { exact: true }).waitFor()
  await page.locator('#settings-toggle').click()
  await page.locator('#identity-panel summary').click()
  await page.locator('#keypair').fill(key)
  await page.getByRole('button', { name: 'Import identity', exact: true }).click()
  await page.reload()
  await widget.getByRole('button', { name: 'Write' }).waitFor()
  assert.equal(await page.locator('#identity-label').textContent(), 'Signed in as ' + key.slice(0, 44))
  await page.locator('#settings-toggle').click()
  await page.locator('#identity-panel summary').click()
  await page.locator('#name').fill('Ev (local test)')
  await widget.getByRole('button', { name: 'Write' }).click()
  const composer = page.locator('wiredove-composer')
  await composer.locator('textarea').fill('Hello from the Wiredove widget. <script>throw new Error("unsafe")</script>')
  const samples = 160000, wav = new Uint8Array(44 + samples * 2)
  const view = new DataView(wav.buffer)
  const text = (offset, s) => wav.set(new TextEncoder().encode(s), offset)
  text(0, 'RIFF'); view.setUint32(4, wav.length - 8, true)
  text(8, 'WAVE'); text(12, 'fmt '); view.setUint32(16, 16, true)
  view.setUint16(20, 1, true); view.setUint16(22, 1, true)
  view.setUint32(24, 16000, true); view.setUint32(28, 32000, true)
  view.setUint16(32, 2, true); view.setUint16(34, 16, true)
  text(36, 'data'); view.setUint32(40, samples * 2, true)
  await composer.locator('input[type=file]').setInputFiles({
    name: 'test.wav', mimeType: 'audio/wav', buffer: Buffer.from(wav),
  })
  await composer.getByRole('button', { name: 'Publish' }).click()
  await page.getByText('Saved on this site.', { exact: true }).waitFor()
  assert.equal(await widget.locator('wiredove-thread-feed wiredove-message').count(), 1)
  assert.equal(await widget.locator('wiredove-message .avatarlink').first().textContent(), 'Ev (local test)')
  const audio = widget.locator('audio').first()
  await audio.waitFor()
  await audio.evaluate(async (node) => {
    node.load()
    await new Promise((resolve, reject) => {
      node.onloadedmetadata = resolve
      node.onerror = () => reject(new Error('Audio decode failed'))
    })
    node.currentTime = 5
    await new Promise((resolve) => node.onseeked = resolve)
  })
  await widget.getByRole('button', { name: 'Search' }).click()
  await widget.getByPlaceholder('Search messages').fill('Wiredove widget')
  await widget.getByRole('button', { name: 'Search' }).last().click()
  await widget.getByText('Hello from the Wiredove widget.', { exact: false }).waitFor()
  await widget.getByRole('button', { name: 'Feed' }).click()
  const video = await page.evaluate(async () => {
    const canvas = document.createElement('canvas')
    canvas.width = 160
    canvas.height = 90
    const ctx = canvas.getContext('2d'), stream = canvas.captureStream(10)
    const chunks = [], recorder = new MediaRecorder(stream, { mimeType: 'video/webm' })
    const done = new Promise((resolve) => {
      recorder.ondataavailable = (event) => chunks.push(event.data)
      recorder.onstop = resolve
    })
    recorder.start()
    for (let i = 0; i < 10; i++) {
      ctx.fillStyle = i % 2 ? 'red' : 'blue'
      ctx.fillRect(0, 0, 160, 90)
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
    recorder.stop()
    await done
    stream.getTracks().forEach((track) => track.stop())
    return Array.from(new Uint8Array(await new Blob(chunks).arrayBuffer()))
  })
  await widget.getByRole('button', { name: 'Write' }).click()
  await composer.locator('textarea').fill('A video attachment.')
  await composer.locator('input[type=file]').setInputFiles({
    name: 'test.webm', mimeType: 'video/webm', buffer: Buffer.from(video),
  })
  await composer.getByRole('button', { name: 'Publish' }).click()
  await widget.locator('video').waitFor()
  await widget.locator('video').evaluate(async (node) => {
    node.load()
    await new Promise((resolve, reject) => {
      node.onloadeddata = resolve
      node.onerror = () => reject(new Error('Video decode failed'))
    })
    await node.play()
    node.pause()
  })
  await page.locator('#logout').click()
  await page.locator('#generate').click()
  await page.waitForFunction(() => document.getElementById('identity-label').textContent.startsWith('Signed in as '))
  const generatedIdentity = await page.locator('#identity-label').textContent()
  await page.reload()
  await widget.getByText('Hello from the Wiredove widget.', { exact: false }).waitFor()
  assert.equal(await page.locator('#identity-label').textContent(), generatedIdentity)
  await page.locator('#settings-toggle').click()
  await page.locator('#identity-panel summary').click()
  await page.locator('#name').fill('Alice (local test)')
  await widget.getByRole('button', { name: 'Reply to this post' }).first().click()
  await composer.locator('textarea').fill('A reply using another identity.')
  await composer.getByRole('button', { name: 'Reply' }).click()
  await widget.getByText('A reply using another identity.', { exact: true }).waitFor()
  await widget.getByRole('button', { name: 'Feed' }).click()
  assert.equal(await widget.locator('wiredove-thread-feed wiredove-message').count(), 2)
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download identity backup' }).click()
  assert.equal((await downloadPromise).suggestedFilename(), 'wiredove-identity.txt')
  await page.screenshot({ path: '/tmp/evbogue-timeline-preview.png', fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.screenshot({ path: '/tmp/evbogue-timeline-mobile.png', fullPage: true })
  await page.locator('#logout').click()
  await page.reload()
  await widget.getByText('Hello from the Wiredove widget.', { exact: false }).waitFor()
  assert.equal(await page.locator('#identity-label').textContent(), 'Reading without signing in.')
  const before = await widget.evaluate((node) => node.shadowRoot.innerHTML)
  const incoming = await compose(key, 'A newly arrived update', { name: 'Ev' })
  const accepted = await app.fetch(new Request('http://localhost/timeline/api/posts', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(incoming),
  }))
  assert.equal(accepted.status, 201)
  await page.evaluate(() => { document.body.style.minHeight = '2000px'; scrollTo(0, 100) })
  const scrollBefore = await page.evaluate(() => scrollY)
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')))
  await page.locator('#new-updates').waitFor()
  assert.equal(await widget.evaluate((node) => node.shadowRoot.innerHTML), before)
  assert.equal(await page.evaluate(() => scrollY), scrollBefore)
  await page.locator('#new-updates').click()
  await widget.getByText('A newly arrived update', { exact: true }).waitFor()
  assert.equal(await widget.locator('wiredove-thread-feed wiredove-message').count(), 3)
  assert.deepEqual(errors, [])
  console.log('Widget browser checks passed: real composer, search, owner post, visitor reply, verified WAV seeking and WebM playback, identity persistence, non-disruptive updates, mobile render, safe text.')
} finally {
  await browser.close()
  await server.shutdown()
  await Deno.remove(directory, { recursive: true })
}
