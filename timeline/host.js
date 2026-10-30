// Site services only. Rendering, identity setup and composing belong to Wiredove.
import { isHash, verify } from './protocol.js';

export function createHost({ owner, relay }, { fetcher = fetch } = {}) {
  if (!isHash(owner)) throw new Error('Invalid timeline owner');
  async function request(path, { signal, ...options } = {}) {
    const response = await fetcher('/timeline/api/' + path, {
      cache: 'no-store', signal, ...options,
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Timeline request failed');
    return data;
  }
  const postJSON = (path, value, options) => request(path, {
    ...options, method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(value),
  });
  const supported = (post) => !post.parsed.edit &&
    post.parsed.type !== 'profile' && post.parsed.type !== 'edit';
  async function loadPosts(options) {
    const { posts } = await request('posts', options);
    const records = await Promise.all(posts.map(async ({ signature, content, relayed }) => ({
      ...await verify(signature, content), relayed: relayed === true,
    })));
    // Only owner originals and descendants of those originals belong to this site.
    const visible = new Map(records.filter(post => supported(post) &&
      post.author === owner && !post.parsed.reply).map(post => [post.id, post]));
    let pending = records.filter(post => supported(post) && post.parsed.reply);
    while (pending.length) {
      const next = pending.filter(post => {
        const parent = visible.get(post.parsed.reply);
        if (!parent || (post.parsed.replyto && post.parsed.replyto !== parent.author)) return true;
        visible.set(post.id, post);
        return false;
      });
      if (next.length === pending.length) break;
      pending = next;
    }
    return [...visible.values()].sort((a, b) => b.timestamp - a.timestamp);
  }
  return {
    owner,
    loadPosts,
    async loadFeed(options) {
      return { posts: (await loadPosts(options)).filter(post => !post.parsed.reply),
        scope: 'local-owner-history', complete: false };
    },
    async getPost(id, options) {
      if (!isHash(id)) throw new Error('Invalid post identifier');
      return (await loadPosts(options)).find(post => post.id === id) || null;
    },
    async getReplies(id, options) {
      if (!isHash(id)) throw new Error('Invalid post identifier');
      return { posts: (await loadPosts(options)).filter(post => post.parsed.reply === id),
        scope: 'local-thread', complete: false };
    },
    async latest(author, options) {
      if (!isHash(author)) throw new Error('Invalid author');
      const result = await request('latest?author=' + encodeURIComponent(author), options);
      const latest = result.latest && await verify(result.latest.signature, result.latest.content);
      if (latest && latest.author !== author) throw new Error('Latest message author mismatch');
      return { latest, remoteAvailable: result.remoteAvailable === true };
    },
    async sync(options) {
      if (!relay) return { added: 0, disabled: true, message: 'Local posts only; relay is disabled.' };
      return await postJSON('sync', {}, options);
    },
    async publishSigned({ signature, content }, options) {
      const post = await verify(signature, content);
      const result = await postJSON('posts', { signature, content }, options);
      if (result.id !== post.id || result.saved !== true) throw new Error('Post storage was not confirmed');
      return { post, saved: true, relayed: result.relayed === true,
        relayError: result.relayError || null };
    },
    async uploadMedia(file, { signature, content }, options) {
      return await request('media', { ...options, method: 'POST',
        headers: { 'X-ANProto-Signature': signature, 'X-ANProto-Content': content }, body: file });
    },
  };
}

export function readRoute(url) {
  const params = new URL(url).searchParams;
  if (params.get('view') === 'identity') return { type: 'identity' };
  if (isHash(params.get('reply'))) return { type: 'compose', replyId: params.get('reply') };
  if (params.get('view') === 'compose') return { type: 'compose' };
  if (isHash(params.get('post'))) return { type: 'post', id: params.get('post') };
  if (isHash(params.get('author'))) return { type: 'profile', author: params.get('author') };
  if (params.has('q')) return { type: 'search', query: params.get('q') };
  try {
    const legacy = decodeURIComponent(new URL(url).hash.slice(1));
    if (isHash(legacy)) return { type: 'post', id: legacy };
  } catch {}
  return { type: 'feed' };
}

export function routeURL(route, base) {
  const url = new URL('/timeline/', base);
  if (route.type === 'identity') url.searchParams.set('view', 'identity');
  else if (route.type === 'compose' && isHash(route.replyTo?.id || route.replyId)) url.searchParams.set('reply', route.replyTo?.id || route.replyId);
  else if (route.type === 'compose') url.searchParams.set('view', 'compose');
  else if (route.type === 'post' && isHash(route.id)) url.searchParams.set('post', route.id);
  else if (route.type === 'profile' && isHash(route.author)) url.searchParams.set('author', route.author);
  else if (route.type === 'search') url.searchParams.set('q', route.query || '');
  else if (route.type !== 'feed') return null;
  return url.pathname + url.search;
}
