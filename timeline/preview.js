import { createHost, routeURL } from './host.js';
import { an } from './protocol.js';
const target = document.getElementById('timeline-preview');
let staging;
try {
  const response = await fetch('/timeline/api/config');
  if (!response.ok) throw new Error('Timeline unavailable');
  const config = await response.json();
  const { defineWiredoveMessage } = await import(config.wiredoveClient);
  defineWiredoveMessage();
  const { posts } = await createHost(config).loadFeed();
  const images = new Map();
  const resolveImage = hash => {
    if (!images.has(hash)) images.set(hash, fetch('/timeline/api/image?hash=' + encodeURIComponent(hash)).then(async response => {
      if (!response.ok) throw new Error('Historical image unavailable');
      const { source } = await response.json();
      if (await an.hash(source) !== hash) throw new Error('Image verification failed');
      return source;
    }).catch(error => { images.delete(hash); throw error; }));
    return images.get(hash);
  };
  const messages = posts.slice(0, 3).map(post => {
    const element = document.createElement('wiredove-message');
    element.setAttribute('appearance', 'publication');
    element.presentation = {
      resolveImage,
      authorURL: post => routeURL({ type: 'profile', author: post.author }, location.href),
      postURL: post => routeURL({ type: 'post', id: post.id }, location.href),
      replyURL: id => routeURL({ type: 'post', id }, location.href),
    };
    element.post = post;
    return element;
  });
  if (messages.length) {
    staging = document.createElement('div');
    staging.hidden = true;
    // Shadow stylesheets do not block paint. Listen before connecting the
    // elements, and keep the readable fallback until every sheet is ready.
    const styled = messages.flatMap(element =>
      [...element.shadowRoot.querySelectorAll('link[rel="stylesheet"]')].map(link =>
        new Promise((resolve, reject) => {
          if (link.sheet) return resolve();
          const timeout = setTimeout(() => reject(new Error('Preview styles timed out')), 10000);
          link.addEventListener('load', () => { clearTimeout(timeout); resolve(); }, { once: true });
          link.addEventListener('error', () => { clearTimeout(timeout); reject(new Error('Preview styles unavailable')); }, { once: true });
        })
      )
    );
    staging.append(...messages);
    target.append(staging);
    await Promise.all(styled);
    for (const child of [...target.childNodes]) {
      if (child !== staging) child.remove();
    }
    staging.hidden = false;
    staging = null;
  }
} catch { /* Server-rendered cached links remain readable. */ }
finally { staging?.remove(); }
