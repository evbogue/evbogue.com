export function parseFrontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
  if (!m) return { data: {}, body: text }
  const data = {}
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^(\w+):\s*(.*)$/)
    if (!kv) continue
    let [, k, v] = kv
    v = v.trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1)
    } else if (v.startsWith('[') && v.endsWith(']')) {
      v = v.slice(1, -1).split(',').map(x => x.trim()).filter(Boolean)
    } else if (v === 'true') v = true
    else if (v === 'false') v = false
    data[k] = v
  }
  return { data, body: m[2] }
}

export function excerptFromBody(body) {
  return body
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 260)
}

export async function loadPost(root, slug) {
  const text = await Deno.readTextFile(`${root}/posts/${slug}.md`)
  const { data, body } = parseFrontmatter(text)
  return { ...data, slug: data.slug || slug, body }
}

export async function loadPosts(root) {
  const posts = []
  for await (const entry of Deno.readDir(`${root}/posts`)) {
    if (!entry.isFile || !entry.name.endsWith('.md')) continue
    const fileSlug = entry.name.replace(/\.md$/, '')
    const post = await loadPost(root, fileSlug)
    posts.push(post)
  }
  posts.sort((a, b) => (a.date < b.date ? 1 : -1))
  return posts
}
