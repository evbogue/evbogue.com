// Site chrome, URLs and service selection only. Wiredove owns the application.
const status = document.getElementById('status');
try {
  const response = await fetch('/timeline/api/config');
  if (!response.ok) throw Error('Timeline configuration unavailable');
  const config = await response.json();
  const { mountWiredove } = await import(config.wiredoveApplication);
  const listeners = new Set();
  const readRoute = () => {
    const params = new URLSearchParams(location.search);
    let hash = location.hash.slice(1);
    try { hash = decodeURIComponent(hash); } catch {}
    if (hash) return hash;
    if (params.has('post')) return params.get('post');
    if (params.has('author')) return params.get('author');
    if (params.has('q')) return '?' + params.get('q');
    if (params.has('reply')) return 'reply=' + params.get('reply');
    if (params.get('view') === 'compose') return 'compose';
    if (params.get('view') === 'identity') return 'settings';
    return config.owner;
  };
  const notify = () => Promise.all([...listeners].map(listener => listener()));
  const navigation = {
    get: readRoute,
    async navigate(route, { replace = false } = {}) {
      route = !route || route === '?' ? config.owner : route;
      const url = '/timeline/' + (route === config.owner ? '' : /^[A-Za-z0-9+/]{43}=$/.test(route) ? '?post=' + encodeURIComponent(route) : '#' + route);
      if (url !== location.pathname + location.search + location.hash) history[replace ? 'replaceState' : 'pushState']({}, '', url);
      await notify();
    },
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
  };
  addEventListener('popstate', () => { void notify(); });
  addEventListener('hashchange', () => { void notify(); });
  const app = await mountWiredove(document.getElementById('wiredove-timeline'), {
    navigation, database: 'evbogue-wiredove-application', legacyDatabase: 'evbogue-wiredove',
    owner: config.owner, backendURL: location.origin + '/timeline',
    mediaURL: location.origin + '/timeline', canonicalURL: location.origin + '/timeline',
    legacyImageURL: location.origin + '/timeline/api/image',
    legacyMediaURL: config.legacyMediaURL || 'https://wiredove.net',
    capabilities: { compose: true, reply: true, upload: true, recording: false, notifications: false },
  });
  document.getElementById('timeline-fallback')?.remove();
  status.textContent = 'Identity and drafts belong to evbogue.com. Wiredove.net has separate browser storage. History and replies may be incomplete.';
  const older = document.getElementById('load-older');
  older.hidden = !config.relay;
  const sync = async () => {
    older.disabled = true;
    try {
      const result = await fetch('/timeline/api/sync', { method: 'POST' });
      const data = await result.json();
      if (!result.ok) throw Error(data.error);
      await app.session.refresh();
      status.textContent = data.message + ' History and replies may be incomplete.';
    } catch (error) { status.textContent = 'Cached posts remain available. ' + error.message; }
    finally { older.disabled = false; }
  };
  older.onclick = sync;
  if (config.relay) await sync();
  window.timelineApplication = app;
} catch (error) {
  status.textContent = 'Unable to load Wiredove: ' + error.message;
}
