// Local-only browser smoke test. Disposable identities and data; no public relay.
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
    owner: key.slice(0, 44),
    relay: '',
    maxMediaBytes: 33554432,
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
  const context = await browser.newContext({
    viewport: { width: 1100, height: 850 },
  })
  const page = await context.newPage(), errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('http://127.0.0.1:' + server.addr.port + '/timeline/')
  await page.getByText('No posts yet.', { exact: true }).waitFor()
  await page.locator('#settings-toggle').click()
  await page.locator('#identity-panel summary').click()
  await page.locator('#keypair').fill(key)
  await page.getByRole('button', { name: 'Import identity', exact: true })
    .click()
  await page.locator('#write-post').waitFor()
  assert.equal(await page.locator('#composer-section').isVisible(), false)
  await page.reload()
  await page.locator('#write-post').waitFor()
  assert.equal(
    await page.locator('#identity-label').textContent(),
    'Signed in as ' + key.slice(0, 44),
  )
  await page.locator('#settings-toggle').click()
  await page.locator('#identity-panel summary').click()
  await page.locator('#name').fill('Ev (local test)')
  await page.locator('#write-post').click()
  await page.locator('#body').fill(
    'Hello from the plain HTML timeline. <script>throw new Error("unsafe")</script>',
  )
  const samples = 160000,
    wav = new Uint8Array(44 + samples * 2),
    view = new DataView(wav.buffer)
  const text = (offset, s) => wav.set(new TextEncoder().encode(s), offset)
  text(0, 'RIFF')
  view.setUint32(4, wav.length - 8, true)
  text(8, 'WAVE')
  text(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, 16000, true)
  view.setUint32(28, 32000, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  text(36, 'data')
  view.setUint32(40, samples * 2, true)
  await page.locator('#media').setInputFiles({
    name: 'test.wav',
    mimeType: 'audio/wav',
    buffer: Buffer.from(wav),
  })
  await page.locator('#publish').click()
  await page.getByText('Saved on this site.', { exact: true }).waitFor()
  assert.equal(await page.locator('audio').count(), 1)
  assert.equal(await page.locator('article').count(), 1)
  await page.locator('audio').evaluate(async (audio) => {
    audio.load()
    await new Promise((resolve, reject) => {
      audio.onloadedmetadata = resolve
      audio.onerror = () => reject(new Error('Audio decode failed'))
    })
    audio.currentTime = 5
    await new Promise((resolve) => audio.onseeked = resolve)
  })
  const video = await page.evaluate(async () => {
    const canvas = document.createElement('canvas')
    canvas.width = 160
    canvas.height = 90
    const ctx = canvas.getContext('2d'),
      stream = canvas.captureStream(10),
      chunks = []
    const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' })
    const done = new Promise((resolve) => {
      recorder.ondataavailable = (e) => chunks.push(e.data)
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
  await page.locator('#write-post').click()
  await page.locator('#body').fill('A video attachment.')
  await page.locator('#media').setInputFiles({
    name: 'test.webm',
    mimeType: 'video/webm',
    buffer: Buffer.from(video),
  })
  await page.locator('#publish').click()
  await page.locator('video').waitFor()
  await page.locator('video').evaluate(async (video) => {
    video.load()
    await new Promise((resolve, reject) => {
      video.onloadeddata = resolve
      video.onerror = () => reject(new Error('Video decode failed'))
    })
    await video.play()
    video.pause()
  })
  await page.locator('#logout').click()
  await page.locator('#generate').click()
  await page.locator('#backup').waitFor({ state: 'visible' })
  await page.waitForFunction(() =>
    document.getElementById('identity-label').textContent.startsWith(
      'Signed in as ',
    )
  )
  const generatedIdentity = await page.locator('#identity-label').textContent()
  await page.reload()
  await page.waitForFunction(() =>
    document.getElementById('identity-label').textContent.startsWith(
      'Signed in as ',
    )
  )
  assert.equal(
    await page.locator('#identity-label').textContent(),
    generatedIdentity,
  )
  await page.locator('#settings-toggle').click()
  await page.locator('#identity-panel summary').click()
  await page.locator('#name').fill('Alice (local test)')
  assert.equal(await page.locator('#composer-section').isVisible(), false)
  await page.getByRole('button', { name: 'Reply', exact: true }).first().click()
  await page.locator('#body').fill('A reply using another identity.')
  await page.locator('#publish').click()
  await page.getByText('1 reply', { exact: true }).click()
  await page.getByText('A reply using another identity.', { exact: true })
    .first().waitFor()
  assert.equal(await page.locator('article').count(), 3)
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download identity backup' }).click()
  assert.equal(
    (await downloadPromise).suggestedFilename(),
    'wiredove-identity.txt',
  )
  await page.screenshot({
    path: '/tmp/evbogue-timeline-preview.png',
    fullPage: true,
  })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.screenshot({
    path: '/tmp/evbogue-timeline-mobile.png',
    fullPage: true,
  })
  await page.locator('#logout').click()
  await page.reload()
  await page.waitForFunction(() =>
    document.getElementById('status').textContent !== 'Loading posts…'
  )
  assert.equal(
    await page.locator('#identity-label').textContent(),
    'Reading without signing in.',
  )
  assert.equal(await page.locator('#composer-section').isVisible(), false)
  // A background check must not replace the feed or move the reader.
  const before = await page.locator('#feed').innerHTML()
  const incoming = await compose(key, 'A newly arrived update', { name: 'Ev' })
  const accepted = await app.fetch(
    new Request('http://localhost/timeline/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(incoming),
    }),
  )
  assert.equal(accepted.status, 201)
  await page.evaluate(() => scrollTo(0, 100))
  const scrollBefore = await page.evaluate(() => scrollY)
  await page.evaluate(() =>
    document.dispatchEvent(new Event('visibilitychange'))
  )
  await page.locator('#new-updates').waitFor()
  assert.equal(await page.locator('#feed').innerHTML(), before)
  assert.equal(await page.evaluate(() => scrollY), scrollBefore)
  await page.locator('#new-updates').click()
  await page.getByText('A newly arrived update', { exact: true }).waitFor()
  assert.equal(await page.locator('#new-updates').isVisible(), false)
  await page.getByText('New since your last visit', { exact: true }).waitFor()
  await page.getByText('Last visit', { exact: true }).waitFor()
  assert.equal(await page.locator('#composer-section').isVisible(), false)
  assert.deepEqual(errors, [])
  console.log(
    'Browser checks passed: collapsed composer/settings, persisted identities, non-disruptive updates and last-visit marker, owner post, AndFS WAV playback/seeking and WebM playback, visitor reply, identity backup, mobile render, no script execution.',
  )
} finally {
  await browser.close()
  await server.shutdown()
  await Deno.remove(directory, { recursive: true })
}
