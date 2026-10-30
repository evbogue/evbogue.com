// Real HTTP gossip + two browser origins. Every identity, record and media fixture
// is disposable; public network access is blocked in both browser contexts.
import { chromium } from 'playwright';
import { Buffer } from 'node:buffer';
import { strict as assert } from 'node:assert';
import { an, open, verify, isHash } from '../protocol.js';
import { createTimeline } from '../server.js';

const directory = await Deno.makeTempDir();
const owner = await an.gen(), visitor = await an.gen();
const pin = JSON.parse(await Deno.readTextFile(new URL('../wiredove-client.json', import.meta.url)));
const root = new URL('../vendor/wiredove/' + pin.revision + '/', import.meta.url);
const values = new Map(), heads = new Map(), events = [];
let rejectPublish = false;
const relay = Deno.serve({ hostname: '127.0.0.1', port: 0, onListen() {} }, async request => {
  const url = new URL(request.url);
  const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Content-Type': 'application/json' };
  if (request.method === 'OPTIONS') return new Response(null, { headers });
  if (url.pathname === '/gossip/poll') return Response.json({ messages: events.slice(Number(url.searchParams.get('since')) || 0), nextSince: events.length }, { headers });
  const value = await request.text();
  if (values.has(value)) return Response.json({ messages: [values.get(value)] }, { headers });
  if (heads.has(value)) return Response.json({ messages: [heads.get(value).signature] }, { headers });
  if (isHash(value)) return Response.json({ messages: [] }, { headers });
  if (rejectPublish) return Response.json({ error: 'Local relay unavailable' }, { status: 503, headers });
  if (value.length === 208) {
    const proof = await open(value);
    if (!values.has(proof.contentHash)) return Response.json({ error: 'Missing content' }, { status: 400, headers });
    const record = await verify(value, values.get(proof.contentHash));
    values.set(record.id, value);
    if (!heads.has(record.author) || record.timestamp >= heads.get(record.author).timestamp) heads.set(record.author, record);
  } else values.set(await an.hash(value), value);
  if (!events.includes(value)) events.push(value);
  return Response.json({ messages: [] }, { headers });
});
const relayOrigin = 'http://127.0.0.1:' + relay.addr.port;
let siteOrigin;
const widgetServer = Deno.serve({ hostname: '127.0.0.1', port: 0, onListen() {} }, async request => {
  const path = new URL(request.url).pathname;
  if (path === '/') return new Response(`<!doctype html><meta name="viewport" content="width=device-width"><wiredove-widget></wiredove-widget><script type="module">
    import {defineWiredoveElements} from '/client/ui.js';
    import {createWiredoveRelay} from '/client/relay.js';
    import {createBrowserStore} from '/client/runtime/browser-store.js';
    import {createPublishingSession} from '/client/runtime/publishing-session.js';
    import {an,compose,identity,verify,open} from '/protocol/protocol.js';
    defineWiredoveElements();
    const relay = createWiredoveRelay({baseURL:${JSON.stringify(relayOrigin)}});
    async function latest(author) {
      for (const signature of await relay.gossip(author)) {
        try { const proof=await open(signature); for(const content of await relay.gossip(proof.contentHash)) {
          try { return {latest:await verify(signature,content),remoteAvailable:true}; } catch {}
        } } catch {}
      }
      return {latest:null,remoteAvailable:true};
    }
    const host={latest,publishSigned:async record=>{await relay.publish(record);return {post:record,saved:true,relayed:true};}};
    const session=createPublishingSession({store:createBrowserStore('local-roundtrip'),host,owner:${JSON.stringify(owner.slice(0,44))},protocol:{generate:()=>an.gen(),identity,compose}});
    await session.initialize(); if(!session.identity()) await session.import(${JSON.stringify(visitor)},'Local visitor');
    const widget=document.querySelector('wiredove-widget');
    widget.session=session;widget.draftStore=session.store;widget.onPublish=draft=>session.publish(draft);widget.capabilities={reply:true,compose:false};
    async function refresh(){const rows=[];for(const value of (await relay.poll()).messages){try{const proof=await open(value);for(const content of await relay.gossip(proof.contentHash)){try{rows.push(await verify(value,content));break;}catch{}}}catch{}}widget.posts=rows;}
    widget.addEventListener('wiredove-routechange',event=>{if(event.detail.type==='post')history.replaceState(null,'','#'+encodeURIComponent(event.detail.id));});
    widget.addEventListener('wiredove-published',async event=>{await refresh();widget.navigate({type:'post',id:event.detail.post.parsed.reply});});
    await refresh();if(location.hash)widget.navigate({type:'post',id:decodeURIComponent(location.hash.slice(1))});
  </script>`, { headers: { 'Content-Type': 'text/html' } });
  try {
    const source = path.startsWith('/protocol/') ? new URL('../' + path.slice(10), import.meta.url) : new URL('.' + path, root);
    if (path.includes('..')) throw new Error('Invalid path');
    return new Response(await Deno.readFile(source), { headers: { 'Content-Type': path.endsWith('.css') ? 'text/css' : 'text/javascript', 'Access-Control-Allow-Origin': '*' } });
  } catch { return new Response('Not found', { status: 404 }); }
});
const widgetOrigin = 'http://127.0.0.1:' + widgetServer.addr.port;
const app = await createTimeline({ directory, config: { owner: owner.slice(0,44), relay: relayOrigin, wiredoveClient: widgetOrigin + '/client/ui.js', maxMediaBytes: 33554432, mediaQuotaBytes: 1073741824 } });
const site = Deno.serve({ hostname: '127.0.0.1', port: 0, onListen() {} }, request => app.fetch(request));
siteOrigin = 'http://127.0.0.1:' + site.addr.port;
let browser;
try {
  browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
  const sitePage = await browser.newPage(), wiredovePage = await browser.newPage();
  const errors = [];
  for (const page of [sitePage,wiredovePage]) {
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/*', route => [siteOrigin,widgetOrigin,relayOrigin].includes(new URL(route.request().url()).origin) ? route.continue() : route.abort());
  }
  await sitePage.goto(siteOrigin + '/timeline/');
  await sitePage.getByRole('button',{name:'Identity & pending posts',exact:true}).click();
  await sitePage.getByLabel('Import Wiredove identity backup').setInputFiles({name:'fixture.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({keypair:owner,name:'Local owner'}))});
  async function publish(body, file) {
    await sitePage.getByRole('button',{name:'Write',exact:true}).click();
    await sitePage.getByPlaceholder('Write a message').fill(body);
    if(file) {
      const selector=file.mimeType.startsWith('image/') ? 'input[accept="image/*"]' : 'input[accept="audio/*,video/*"]';
      await sitePage.locator('wiredove-composer ' + selector).setInputFiles(file);
      await sitePage.getByText('Attachment ready',{exact:true}).waitFor();
    }
    await sitePage.locator('wiredove-composer').getByRole('button',{name:'Publish',exact:true}).click();
    await sitePage.getByText(body,{exact:true}).waitFor();
  }
  const png=await sitePage.evaluate(()=>{const canvas=document.createElement('canvas');canvas.width=canvas.height=32;canvas.getContext('2d').fillRect(0,0,32,32);return canvas.toDataURL().split(',')[1];});
  await publish('Owner image through site',{name:'fixture.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')});
  console.log('Site image stored and relayed');
  await wiredovePage.goto(widgetOrigin);
  await wiredovePage.getByText('Owner image through site',{exact:true}).waitFor();
  await wiredovePage.getByRole('button',{name:'Reply to this post',exact:true}).first().click();
  await wiredovePage.getByPlaceholder('Write a reply').fill('Reply from the other Wiredove client');
  await wiredovePage.locator('wiredove-composer').getByRole('button',{name:'Reply',exact:true}).click();
  await wiredovePage.getByText('Reply from the other Wiredove client',{exact:true}).waitFor();
  console.log('Wiredove reply stored and relayed');
  // Let the production sync throttle expire, then observe inbound relay discovery.
  await new Promise(resolve=>setTimeout(resolve,15500));
  await sitePage.reload();
  await sitePage.getByText('Reply from the other Wiredove client',{exact:true}).waitFor();
  await wiredovePage.reload();
  await wiredovePage.getByText('Reply from the other Wiredove client',{exact:true}).waitFor();
  console.log('Bidirectional reply and reload passed');
  // Actual decodable audio and video fixtures, created locally without microphones.
  const wav=Buffer.alloc(44+16000);wav.write('RIFF',0);wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(8000,24);wav.writeUInt32LE(16000,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(16000,40);
  await publish('Owner audio through site',{name:'fixture.wav',mimeType:'audio/wav',buffer:wav});
  const video=await sitePage.evaluate(async()=>{
    const canvas=document.createElement('canvas');canvas.width=canvas.height=32;const ctx=canvas.getContext('2d');ctx.fillRect(0,0,32,32);
    const stream=canvas.captureStream(10),chunks=[];const recorder=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp8'});
    const blob=await new Promise(resolve=>{recorder.ondataavailable=event=>chunks.push(event.data);recorder.onstop=()=>resolve(new Blob(chunks,{type:'video/webm'}));recorder.start();setTimeout(()=>{ctx.fillStyle='red';ctx.fillRect(0,0,32,32);},100);setTimeout(()=>recorder.stop(),500);});
    stream.getTracks().forEach(track=>track.stop());return Array.from(new Uint8Array(await blob.arrayBuffer()));
  });
  await publish('Owner video through site',{name:'fixture.webm',mimeType:'video/webm',buffer:Buffer.from(video)});
  console.log('Audio/video stored and relayed');
  for (const page of [sitePage,wiredovePage]) {
    await page.goto(page===sitePage ? siteOrigin + '/timeline/' : widgetOrigin);
    await page.getByText('Owner video through site',{exact:true}).waitFor();
    for(const tag of ['audio','video']) {
      const player=page.locator('wiredove-message ' + tag).first();
      await player.waitFor();
      await player.scrollIntoViewIfNeeded();
      await player.evaluate(async node=>{if(!node.readyState)await new Promise((resolve,reject)=>{setTimeout(()=>reject(new Error('Media metadata timed out')),10000);node.addEventListener('loadedmetadata',resolve,{once:true});node.addEventListener('error',()=>reject(new Error('Media decode failed')),{once:true});});await node.play();node.pause();node.currentTime=Number.isFinite(node.duration)?node.duration/2:0.1;});
    }
  }
  rejectPublish=true;
  await publish('Saved locally during relay outage');
  rejectPublish=false;
  await sitePage.getByRole('button',{name:'Identity & pending posts',exact:true}).click();
  await sitePage.getByRole('button',{name:'Retry pending publication',exact:true}).click();
  await sitePage.getByRole('status').filter({hasText:'Published and confirmed by Wiredove.'}).waitFor();
  await wiredovePage.reload();
  await wiredovePage.getByText('Saved locally during relay outage',{exact:true}).waitFor();
  const stored=app.readPosts();
  assert.equal(stored.length,5);assert.equal(stored.filter(row=>row.parsed.body==='Saved locally during relay outage').length,1);
  assert.deepEqual(errors,[]);
  console.log('Passed: two real browser origins + local HTTP relay, site image -> Wiredove, Wiredove reply -> site and reload, verified audio/video playback/seek in both clients, relay outage and exact retry without duplicates.');
} finally {
  await browser?.close();await site.shutdown();await widgetServer.shutdown();await relay.shutdown();await Deno.remove(directory,{recursive:true});
}
