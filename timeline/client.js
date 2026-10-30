// The host supplies verified data; Wiredove owns every timeline interaction.
import { createHost, readRoute, routeURL } from "./host.js";
import { an } from "./protocol.js";
import { createSiteSession } from "./session.js";

const widget = document.querySelector("wiredove-widget");
const status = document.getElementById("status");
async function request(path, options = {}) {
  const response = await fetch("/timeline/api/" + path, { cache: "no-store", ...options });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}
try {
  const config = await request("config");
  const { defineWiredoveElements } = await import(config.wiredoveClient);
  defineWiredoveElements();
  const host = createHost(config);
  // Only documented public APIs cross the host/widget boundary.
  const images = new Map();
  let replyCounts = new Map();
  const countReplies = records => {
    replyCounts = new Map();
    for (const post of records) if (post.parsed.reply) replyCounts.set(post.parsed.reply, (replyCounts.get(post.parsed.reply) || 0) + 1);
  };
  widget.pageSize = 20;
  widget.presentation = {
    appearance: 'publication', title: '',
    emptyMessage: 'No verified posts cached yet. Wiredove history may be unavailable or incomplete.',
    replyCount: post => replyCounts.get(post.id) || 0,
    resolveImage: async hash => {
      if (!images.has(hash)) images.set(hash, request('image?hash=' + encodeURIComponent(hash))
        .then(async result => {
          if (await an.hash(result.source) !== hash) throw new Error('Historical image hash mismatch');
          return result.source;
        }).catch(error => { images.delete(hash); throw error; }));
      return await images.get(hash);
    },
    postURL: post => routeURL({ type: 'post', id: post.id }, location.href),
    authorURL: post => routeURL({ type: 'profile', author: post.author }, location.href),
    replyURL: id => routeURL({ type: 'post', id }, location.href),
  };
  let restoring = false;
  const restore = () => {
    restoring = true;
    try {
      const route = readRoute(location.href);
      if (route.type === 'compose' && route.replyId) {
        const replyTo = posts.find(post => post.id === route.replyId);
        widget.navigate(replyTo ? { type: 'compose', replyTo } : { type: 'post', id: route.replyId });
      } else widget.navigate(route);
    }
    finally { restoring = false; }
  };
  widget.addEventListener('wiredove-routechange', event => {
    if (restoring) return;
    const target = routeURL(event.detail, location.href);
    if (!target || target === location.pathname + location.search) return;
    history.replaceState({ ...history.state, timelineScroll: scrollY }, '');
    history.pushState({ timelineScroll: 0 }, '', target);
    window.scrollTo(0, 0);
  });
  window.addEventListener('popstate', () => {
    restore();
    requestAnimationFrame(() => window.scrollTo(0, history.state?.timelineScroll || 0));
  });
  let posts = await host.loadPosts();
  countReplies(posts);
  widget.posts = posts;
  let session;
  try {
    session = await createSiteSession(config, host);
    widget.session = session;
    widget.draftStore = session.store;
    widget.onPublish = draft => session.publish(draft);
    const capabilities = () => {
      widget.capabilities = { reply: true, compose: session.identity()?.author === config.owner };
    };
    capabilities();
    widget.addEventListener('wiredove-identitychange', capabilities);
    const refresh = async result => {
      posts = await host.loadPosts(); countReplies(posts); widget.posts = posts;
      const post = result?.post;
      if (post) widget.navigate({ type: 'post', id: post.parsed.reply || post.id });
      status.textContent = result?.relayed ? 'Published and confirmed by Wiredove.' : 'Saved here; relay confirmation pending. Use Identity & pending posts to retry.';
    };
    widget.addEventListener('wiredove-published', event => { void refresh(event.detail).catch(error => { status.textContent = error.message; }); });
    widget.addEventListener('wiredove-retry', event => { void refresh(event.detail.at(-1)).catch(error => { status.textContent = error.message; }); });
  } catch (error) {
    status.textContent = 'Posts are readable, but browser identity storage is unavailable: ' + error.message;
  }
  restore();
  document.getElementById('timeline-fallback')?.remove();
  let used = false;
  widget.addEventListener('pointerdown', () => { used = true; }, { capture: true });
  widget.addEventListener('keydown', () => { used = true; }, { capture: true });
  // Initial synchronization only. Background refresh awaits an upstream lifecycle
  // API that preserves active playback, drafts and conversation DOM.
  if (config.relay) {
    status.textContent = 'Checking Wiredove for posts…';
    try {
      const result = await host.sync();
      if (result.added && !used) {
        posts = await host.loadPosts();
        if (!used) { countReplies(posts); widget.posts = posts; }
      }
      status.textContent = result.message +
        (result.added && used ? ' Reload to show new posts.' : '') +
        ' History and replies may be incomplete.';
    } catch {
      status.textContent = 'Showing locally stored posts. Wiredove synchronization is unavailable; history and replies may be incomplete.';
    }
  } else if (session) {
    status.textContent = 'Showing locally stored posts. Relay synchronization is disabled.';
  }
  const older = document.getElementById('load-older');
  if (older) {
    older.hidden = !config.relay;
    older.onclick = async () => {
      older.disabled = true;
      try {
        const result = await host.sync();
        posts = await host.loadPosts(); countReplies(posts); widget.posts = posts;
        status.textContent = result.message + ' History and replies may be incomplete.';
      } catch (error) { status.textContent = 'Cached posts remain available. ' + error.message; }
      finally { older.disabled = false; }
    };
  }
} catch (error) {
  status.textContent = "Unable to load the Wiredove widget: " + error.message;
}
