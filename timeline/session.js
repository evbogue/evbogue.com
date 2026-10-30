// Host adapters only. Wiredove owns identity, composer, draft and outbox UI.
import { an, compose, identity } from './protocol.js';

export async function createSiteSession(config, host) {
  const base = new URL('./', new URL(config.wiredoveClient, location.href));
  const [{ createBrowserStore }, { createPublishingSession }, { createAndFSMediaClient }, { createAndFS }, { memoryStore }] = await Promise.all([
    import(new URL('runtime/browser-store.js', base)),
    import(new URL('runtime/publishing-session.js', base)),
    import(new URL('andfs.js', base)),
    import(new URL('../vendor/andfs/andfs.js', base)),
    import(new URL('../vendor/andfs/stores.js', base)),
  ]);
  const session = createPublishingSession({
    owner: config.owner, host,
    store: createBrowserStore('evbogue-wiredove'),
    protocol: { generate: () => an.gen(), identity, compose },
    uploadMedia: async (file, keypair, metadata) => {
      const uploader = createAndFSMediaClient({
        files: createAndFS({ store: memoryStore() }),
        signPayload: async content => an.sign(await an.hash(content), keypair),
        endpoint: '/timeline/api/media', origin: () => location.origin + '/timeline',
        maxBytes: config.maxMediaBytes,
      });
      return await uploader.upload(file, metadata);
    },
  });
  await session.initialize();
  // Preserve identities explicitly remembered by the previous site adapter.
  // Keep the old entry intact so rolling back does not erase browser identity.
  if (!session.identity()) {
    const previous = localStorage.getItem('evbogue.timeline.key');
    if (previous) await session.import(previous, localStorage.getItem('evbogue.timeline.name.' + previous.slice(0, 44)) || '');
  }
  return session;
}
