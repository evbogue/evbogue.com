const FILE = "subscribers.json"

function normalize(entry) {
  if (typeof entry !== "string") return entry
  const now = new Date().toISOString()
  return {
    email: entry.trim().toLowerCase(),
    token: crypto.randomUUID().replaceAll("-", ""),
    subscribed_at: now,
    confirmed_at: now,
    unsubscribed_at: null,
    source: "import",
  }
}

export async function loadSubscribers(root) {
  try {
    const parsed = JSON.parse(await Deno.readTextFile(`${root}/${FILE}`))
    if (!Array.isArray(parsed)) return []
    return parsed.map(normalize)
  } catch {
    return []
  }
}

export async function saveSubscribers(root, subscribers) {
  await Deno.writeTextFile(
    `${root}/${FILE}`,
    JSON.stringify(subscribers, null, 2),
  )
}

export async function addSubscriber(root, email, source = "form") {
  const normalized = email.trim().toLowerCase()
  if (!normalized || !normalized.includes("@")) return null

  const subscribers = await loadSubscribers(root)
  const now = new Date().toISOString()
  const existing = subscribers.find((s) => s.email === normalized)

  if (existing) {
    if (existing.unsubscribed_at) {
      existing.unsubscribed_at = null
      existing.subscribed_at = now
      existing.confirmed_at = now
      existing.source = source
      await saveSubscribers(root, subscribers)
    }
    return existing
  }

  const fresh = {
    email: normalized,
    token: crypto.randomUUID().replaceAll("-", ""),
    subscribed_at: now,
    confirmed_at: now,
    unsubscribed_at: null,
    source,
  }
  subscribers.push(fresh)
  await saveSubscribers(root, subscribers)
  return fresh
}

export async function unsubscribeByToken(root, token) {
  if (!token) return null
  const subscribers = await loadSubscribers(root)
  const entry = subscribers.find((s) => s.token === token)
  if (!entry) return null
  if (!entry.unsubscribed_at) {
    entry.unsubscribed_at = new Date().toISOString()
    await saveSubscribers(root, subscribers)
  }
  return entry
}

export async function findByToken(root, token) {
  if (!token) return null
  const subscribers = await loadSubscribers(root)
  return subscribers.find((s) => s.token === token) ?? null
}

export function activeSubscribers(subscribers) {
  return subscribers.filter((s) => !s.unsubscribed_at && s.confirmed_at)
}

export function unsubscribeUrl(token) {
  return `https://evbogue.com/unsubscribe?token=${token}`
}
