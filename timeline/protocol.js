import { an } from './vendor/anproto/an.js'
import { yaml } from './vendor/yaml.js'
export { an, yaml }
export const isHash = (value) =>
  typeof value === 'string' && /^[A-Za-z0-9+/]{43}=$/.test(value)
export const isAndFS = (value) =>
  typeof value === 'string' && /^[A-Za-z0-9_-]{43}$/.test(value)
export const MAX_TEXT = 65536

export async function identity(keypair) {
  if (
    typeof keypair !== 'string' || keypair.length !== 132 ||
    !isHash(keypair.slice(0, 44))
  ) throw new Error('Invalid Wiredove keypair')
  const challenge = await an.hash('evbogue.com identity check')
  const signed = await an.sign(challenge, keypair)
  const proof = await open(signed)
  if (proof.contentHash !== challenge) {
    throw new Error('Private and public keys do not match')
  }
  return proof.author
}

export async function open(signature) {
  if (
    typeof signature !== 'string' || signature.length !== 208 ||
    !isHash(signature.slice(0, 44))
  ) throw new Error('Invalid ANProto signature')
  let opened
  try {
    opened = await an.open(signature)
  } catch {
    throw new Error('Invalid ANProto signature')
  }
  if (!/^\d{13}[A-Za-z0-9+/]{43}=$/.test(opened)) {
    throw new Error('Invalid signed timestamp and hash')
  }
  return {
    author: signature.slice(0, 44),
    timestamp: Number(opened.slice(0, 13)),
    contentHash: opened.slice(13),
  }
}

export async function verify(signature, content) {
  if (
    typeof content !== 'string' ||
    new TextEncoder().encode(content).length > MAX_TEXT
  ) throw new Error('Post exceeds 64 KiB')
  const proof = await open(signature)
  if (await an.hash(content) !== proof.contentHash) {
    throw new Error('Content hash does not match signature')
  }
  if (proof.timestamp > Date.now() + 300000) {
    throw new Error('Post timestamp is in the future')
  }
  const parsed = await yaml.parse(content)
  for (
    const key of [
      'body',
      'name',
      'image',
      'previous',
      'reply',
      'replyto',
      'edit',
      'type',
      'andfs',
      'mime',
      'media_name',
      'media_url',
    ]
  ) {
    if (parsed[key] !== undefined && typeof parsed[key] !== 'string') {
      throw new Error('Invalid ' + key)
    }
  }
  for (const key of ['previous', 'reply', 'replyto', 'edit']) {
    if (parsed[key] && !isHash(parsed[key])) {
      throw new Error('Invalid ' + key + ' hash')
    }
  }
  if (
    parsed.andfs &&
    (!isAndFS(parsed.andfs) ||
      !['audio', 'video', 'image'].includes(parsed.type) ||
      !Number.isSafeInteger(parsed.media_size) || parsed.media_size < 0)
  ) throw new Error('Invalid AndFS attachment')
  if (!(parsed.body || '').trim() && !parsed.andfs && !parsed.blob) {
    throw new Error('Write a post or attach media')
  }
  return { id: await an.hash(signature), signature, content, ...proof, parsed }
}

export async function compose(keypair, body, metadata = {}) {
  const content = await yaml.create(metadata, body)
  if (!content) throw new Error('Could not encode post')
  const signature = await an.sign(await an.hash(content), keypair)
  return await verify(signature, content)
}
