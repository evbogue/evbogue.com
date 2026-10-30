// Copy a committed upstream release byte-for-byte. Never snapshot a dirty tree.
const source = Deno.args[0];
const revision = Deno.args[1];
if (!source || !/^[a-f0-9]{40}$/.test(revision || '')) {
  throw new Error('Usage: deno run --allow-read --allow-write --allow-run=git scripts/pin-wiredove.js /path/to/wiredove <full-commit-sha>');
}
const decoder = new TextDecoder();
async function git(...args) {
  const result = await new Deno.Command('git', { args: ['-C', source, ...args], stdout: 'piped', stderr: 'piped' }).output();
  if (!result.success) throw new Error(decoder.decode(result.stderr));
  return result.stdout;
}
const resolved = decoder.decode(await git('rev-parse', revision + '^{commit}')).trim();
if (resolved !== revision) throw new Error('Revision is not an exact commit');
const paths = decoder.decode(await git('ls-tree', '-r', '--name-only', revision, '--', 'client', 'vendor', 'style.css', 'LICENSE'))
  .trim().split('\n').filter(path => !/[._]test\.js$/.test(path) &&
    !path.includes('/tests/') && !path.includes('demo') && !path.endsWith('.html'));
if (!paths.includes('client/ui.js') || !paths.includes('style.css')) throw new Error('Missing Wiredove entry points');
const root = new URL('../timeline/vendor/wiredove/', import.meta.url);
await Deno.mkdir(root, { recursive: true });
const destination = new URL(revision + '/', root);
const files = {};
for (const path of paths) {
  const bytes = await git('show', revision + ':' + path);
  files[path] = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)))
    .map(byte => byte.toString(16).padStart(2, '0')).join('');
  const target = new URL(path, destination);
  await Deno.mkdir(new URL('./', target), { recursive: true });
  await Deno.writeFile(target, bytes);
}
// Written last: an interrupted update never changes the active module pointer.
const manifest = {
  repository: 'https://github.com/evbogue/wiredove', revision,
  entry: '/timeline/vendor/wiredove/' + revision + '/client/ui.js', files,
};
const target = new URL('../timeline/wiredove-client.json', import.meta.url);
const temporary = new URL('../timeline/wiredove-client.json.tmp', import.meta.url);
await Deno.writeTextFile(temporary, JSON.stringify(manifest, null, 2) + '\n');
await Deno.rename(temporary, target);
console.log('Pinned Wiredove ' + revision + ' (' + paths.length + ' unchanged upstream files).');
