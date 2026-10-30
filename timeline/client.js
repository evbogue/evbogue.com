// The host supplies verified data; Wiredove owns every timeline interaction.
import { createHost, readRoute, routeURL } from "./host.js";

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
  widget.presentation = {
    postURL: post => routeURL({ type: 'post', id: post.id }, location.href),
    authorURL: post => routeURL({ type: 'profile', author: post.author }, location.href),
    replyURL: id => routeURL({ type: 'post', id }, location.href),
  };
  let restoring = false;
  const restore = () => {
    restoring = true;
    try { widget.navigate(readRoute(location.href)); }
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
  widget.posts = await host.loadPosts();
  restore();
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
        const posts = await host.loadPosts();
        if (!used) widget.posts = posts;
      }
      status.textContent = result.message +
        (result.added && used ? ' Reload to show new posts.' : '') +
        ' History and replies may be incomplete.';
    } catch {
      status.textContent = 'Showing locally stored posts. Wiredove synchronization is unavailable; history and replies may be incomplete.';
    }
  } else {
    status.textContent = 'Showing locally stored posts. Relay synchronization is disabled.';
  }
} catch (error) {
  status.textContent = "Unable to load the Wiredove widget: " + error.message;
}
