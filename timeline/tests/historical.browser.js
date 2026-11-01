// Invoked by application.browser.js against disposable real site services only.
import { strict as assert } from 'node:assert';
import { Buffer } from 'node:buffer';
import { an, compose } from '../protocol.js';

export async function historicalCompatibility({ page, embed, ownerPage, app, config, directory, owner, origin, pin, allowOrigin }) {
  const { MemoryBlobStore, putBlob } = await import('../vendor/wiredove/' + pin.revision + '/anproto_blob.js');
  const legacy = new MemoryBlobStore();
  let corrupt = false;
  const legacyServer = Deno.serve({ hostname: '127.0.0.1', port: 0, onListen() {} }, async request => {
    const id = decodeURIComponent(new URL(request.url).pathname.slice('/blobs/'.length));
    let bytes = await legacy.get(id);
    if (bytes && corrupt) { bytes = bytes.slice(); bytes[0] ^= 1; }
    return new Response(bytes || null, { status: bytes ? 200 : 404, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/octet-stream' } });
  });
  const legacyOrigin = 'http://127.0.0.1:' + legacyServer.addr.port;
  allowOrigin(legacyOrigin); config.legacyMediaURL = legacyOrigin;
  const signed = [];
  const save = async (body, metadata = {}) => {
    const record = await compose(owner, body, metadata); signed.push(record);
    const response = await app.fetch(new Request(origin + '/timeline/api/import', { method: 'POST', body: JSON.stringify({ posts: [record] }) }));
    assert.equal(response.status, 200, await response.clone().text());
    return record;
  };
  const boot = async url => { await page.goto(url); await page.waitForFunction(() => window.timelineApplication); };
  const open = async (surface, record) => {
    await surface.evaluate(async ({ id, site }) => { const application = site ? window.timelineApplication : window.app; await application.session.refresh(); await application.navigate(id); }, { id: record.id, site: surface === page });
    await surface.getByText(record.parsed.body, { exact: true }).first().waitFor();
  };
  try {
    // Real decodable APDS image; its ID authenticates the data URL, not PNG bytes.
    const png = await page.evaluate(() => { const canvas = document.createElement('canvas'); canvas.width = canvas.height = 16; canvas.getContext('2d').fillRect(0, 0, 16, 16); return canvas.toDataURL(); });
    const imageHash = await an.hash(png);
    await Deno.writeTextFile(directory + '/images/' + encodeURIComponent(imageHash) + '.json', JSON.stringify(png));
    const imagePost = await save('Historical image fixture\n![](' + imageHash + ')', { image: imageHash, name: 'Historical Owner' });
    await boot(origin + '/timeline/?post=' + encodeURIComponent(imagePost.id));
    const gallery = page.locator('wiredove-image-gallery img').first();
    await gallery.waitFor();
    await page.waitForFunction(() => { const root = document.getElementById('wiredove-timeline').shadowRoot; const image = root.querySelector('wiredove-image-gallery img'); return image?.complete && image.naturalWidth === 16; });
    assert.equal(await gallery.getAttribute('src'), png);
    await page.waitForFunction(source => [...document.getElementById('wiredove-timeline').shadowRoot.querySelectorAll('img.avatar')].some(image => image.src === source && image.naturalWidth === 16), png);
    await page.reload(); await page.waitForFunction(() => window.timelineApplication);
    await gallery.waitFor();
    await embed.reload(); await embed.waitForFunction(() => window.ready);
    await embed.evaluate(async id => { await app.session.refresh(); await app.navigate(id); }, imagePost.id);
    // The second host explicitly supplies the same historical image service.
    await embed.locator('wiredove-image-gallery img').first().waitFor();
    await embed.waitForFunction(() => { const image = document.getElementById('embed').shadowRoot.querySelector('wiredove-image-gallery img'); return image?.complete && image.naturalWidth === 16; });

    console.log('Historical APDS inline/avatar decode passed');
    // Old public query links and encoded hashes retain their meaning after reload.
    for (const suffix of ['?post=' + encodeURIComponent(imagePost.id), '#' + imagePost.id, '#' + encodeURIComponent(imagePost.id)]) {
      await boot(origin + '/timeline/' + suffix); await gallery.waitFor();
      await page.reload(); await page.waitForFunction(() => window.timelineApplication); await gallery.waitFor();
    }
    await boot(origin + '/timeline/?q=' + encodeURIComponent('Historical image fixture'));
    assert.equal(await page.evaluate(() => timelineApplication.navigation.get()), '?Historical image fixture');
    await gallery.waitFor();
    await boot(origin + '/timeline/?author=' + encodeURIComponent(config.owner)); await gallery.waitFor();
    await boot(origin + '/timeline/?reply=' + encodeURIComponent(imagePost.id));
    await page.getByPlaceholder('Write a message').waitFor();
    await page.getByRole('button', { name: 'Close composer (draft saved)', exact: true }).click();
    await boot(origin + '/timeline/?view=identity');
    assert.equal(await page.evaluate(() => timelineApplication.navigation.get()), 'settings');
    await ownerPage.goto(origin + '/timeline/?view=compose'); await ownerPage.waitForFunction(() => window.timelineApplication);
    await ownerPage.getByPlaceholder('Write a message').waitFor();
    await ownerPage.getByRole('button', { name: 'Close composer (draft saved)', exact: true }).click();

    console.log('Historical query/hash links passed');
    const wav = Buffer.alloc(44 + 1100000); wav.write('RIFF', 0); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8); wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22); wav.writeUInt32LE(8000, 24); wav.writeUInt32LE(16000, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(wav.length - 44, 40);
    const video = new Uint8Array(await page.evaluate(async () => {
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 32; const ctx = canvas.getContext('2d'); ctx.fillRect(0, 0, 32, 32);
      const stream = canvas.captureStream(10), chunks = [], recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp8' });
      const blob = await new Promise(resolve => { recorder.ondataavailable = event => chunks.push(event.data); recorder.onstop = () => resolve(new Blob(chunks)); recorder.start(); setTimeout(() => { ctx.fillStyle = 'red'; ctx.fillRect(0, 0, 32, 32); }, 100); setTimeout(() => recorder.stop(), 500); });
      stream.getTracks().forEach(track => track.stop()); return [...new Uint8Array(await blob.arrayBuffer())];
    }));
    const audioID = await putBlob(wav, legacy), videoID = await putBlob(video, legacy);
    assert(audioID.startsWith('anblob:v1:chunked:')); assert(videoID.startsWith('anblob:v1:raw:'));
    const audioPost = await save('Historical chunked audio fixture', { type: 'audio', blob: audioID, mime: 'audio/wav', media_source: legacyOrigin });
    const videoPost = await save('Historical raw video fixture', { type: 'video', blob: videoID, mime: 'video/webm', media_source: legacyOrigin });
    // No source in old signed metadata: the explicit legacy service adapter owns it.
    const fallbackBytes = Buffer.from(wav); fallbackBytes[45] = 1;
    const fallbackID = await putBlob(fallbackBytes, legacy);
    const fallback = await save('Historical source-free audio fixture', { type: 'audio', blob: fallbackID, mime: 'audio/wav' });
    await boot(origin + '/timeline/?post=' + encodeURIComponent(audioPost.id));
    corrupt = true;
    await page.getByText('Media unavailable. Please retry.', { exact: true }).waitFor();
    assert.equal(await page.locator('audio').getAttribute('src'), null);
    corrupt = false;
    await page.getByRole('button', { name: 'Retry media', exact: true }).click();
    for (const [record, tag, bytes] of [[audioPost, 'audio', wav], [videoPost, 'video', video], [fallback, 'audio', fallbackBytes]]) {
      for (const surface of [page, embed]) {
        await open(surface, record);
        const player = surface.locator(tag + ':visible').first(); await player.scrollIntoViewIfNeeded();
        await surface.locator('.media-post[data-verified="true"]:visible').first().waitFor();
        const actual = await player.evaluate(async element => [...new Uint8Array(await (await fetch(element.src)).arrayBuffer())]);
        assert.deepEqual(new Uint8Array(actual), new Uint8Array(bytes), record.parsed.body + ' / ' + (surface === page ? 'site' : 'embed'));

        await player.evaluate(element => element.play());
        await player.evaluate(element => new Promise((resolve, reject) => { const started = performance.now(); const timer = setInterval(() => { if (element.currentTime > 0) { clearInterval(timer); element.pause(); resolve(); } else if (performance.now() - started > 5000) { clearInterval(timer); reject(Error('Playback did not advance')); } }, 20); }));
        if (tag === 'audio') { await player.evaluate(element => { element.currentTime = 2; }); assert((await player.evaluate(element => element.currentTime)) >= 2); }
      }
    }
    // Existing AndFS /media links and the new hash route resolve identical bytes.
    const { createAndFS } = await import('../vendor/andfs/andfs.js');
    const { memoryStore } = await import('../vendor/andfs/stores.js');
    const andfs = await createAndFS({ store: memoryStore() }).add(wav);
    const authorization = JSON.stringify({ action: 'andfs-upload-v1', andfs: andfs.manifestHash, mime: 'audio/wav', media_size: wav.length });
    assert.equal((await app.fetch(new Request(origin + '/timeline/api/media', { method: 'POST', headers: { 'X-ANProto-Content': authorization, 'X-ANProto-Signature': await an.sign(await an.hash(authorization), owner) }, body: wav }))).status, 201);
    const historicalURL = origin + '/timeline/media/' + andfs.manifestHash;
    const response = await fetch(historicalURL); assert.equal(response.status, 200); assert.deepEqual(new Uint8Array(await response.arrayBuffer()), new Uint8Array(wav));
    const range = await fetch(historicalURL, { headers: { Range: 'bytes=0-43' } }); assert.equal(range.status, 206); assert.deepEqual(new Uint8Array(await range.arrayBuffer()), new Uint8Array(wav.subarray(0, 44)));
    const modern = await save('Historical AndFS URL fixture', { type: 'audio', andfs: andfs.manifestHash, mime: 'audio/wav', media_size: wav.length, media_url: historicalURL, media_source: origin + '/timeline' });
    for (const surface of [page, embed]) {
      await open(surface, modern); await surface.locator('audio:visible').first().scrollIntoViewIfNeeded(); await surface.locator('.media-post[data-verified="true"]:visible').first().waitFor();
      await surface.evaluate(hash => (window.timelineApplication || window.app).navigate(hash), andfs.manifestHash);
      await surface.locator('audio:visible').first().waitFor();
    }
    // Compare the stored signed originals after every route/render/playback action.
    for (const record of signed) { const stored = app.readPosts().find(row => row.id === record.id); assert.equal(stored.content, record.content); assert.equal(stored.signature, record.signature); }
    await boot(origin + '/timeline/?post=' + encodeURIComponent(audioPost.id)); await page.locator('.media-post[data-verified="true"]').waitFor();
    await page.setViewportSize({ width: 390, height: 950 }); await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
    await page.screenshot({ path: 'test-results/historical-media-390-dark.png', fullPage: true, animations: 'disabled' });
    console.log('Historical compatibility passed: APDS inline/avatar decode, old query/hash links, raw/chunked anblob playback/seek, corrupt retry, source adapter, AndFS gateway/range/hash routes, immutable signed originals. No public writes.');
  } finally { await legacyServer.shutdown(); }
}
