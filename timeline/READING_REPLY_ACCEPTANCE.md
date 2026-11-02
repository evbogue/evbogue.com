# Reading and reply acceptance — 1 November 2026

Baseline: site `2c6ce38`, shared application pin `2992b9d`. This check did not
deploy code or publish public fixtures. Fresh isolated browser contexts were used.

| Flow | Live read-only check | Isolated local site and second-origin embed |
|---|---|---|
| Read and permalink/reload | Passed on a current owner's text post | Passed |
| Reply entry by keyboard | Enter opens identity creation/import | Enter restores the migrated reply draft |
| Identity creation | Setup opened; no live identity created | Create identity activated with Enter; profile saved |
| Signed reply and reload | Intentionally untested | Both directions passed; stored author/parent and duplicate count checked |
| Failed-send exact retry | Intentionally untested | Existing two-origin suite passed |
| Phone layout | Mounted permalink has no document overflow at 390/320px | 1200/390/320px, light and dark passed |

Live permalink:
`/timeline/?post=N9GtApqwQYgKOkMnUlDkIKEJT%2FsZjOHomxoHVRy4GSw%3D`.
Chromium screenshots were captured at 1280/390/320px in
`/tmp/reading-loop-final-*.png`; the 320px screenshot was visually inspected.

The live browser blocked HTTP methods other than GET and all WebSockets. This
also blocked the site's normal POST-based inbound sync, causing its expected
“Cached posts remain available. Failed to fetch” notice. That notice is not
evidence of a production sync defect. Cached reading and the permalink still
worked. An initial pre-mount 320px overflow measurement did not reproduce after
mount/reload; it was not used to justify a speculative CSS change.

Checks: `deno task timeline:test` passed 16 tests. `deno task timeline:browser`
passed twice, including the strengthened keyboard activation checks. The suite
also exercised historical links/images/media, edits with immutable originals,
draft migration, and separate-origin interoperability with public writes blocked.
Its expected missing-resource and aborted-blob console messages did not fail
acceptance. No full keyboard traversal, screen-reader, physical Safari, complete
historical corpus, or full feature-parity claim is made.

No reproducible obstacle was found in the tested core reading/reply loop.
Next: begin one real Fame observation using existing published work and explicit
review dates. Historical large-image limits and wider accessibility remain
separate known work; see the shared application order and site AGENTS.md.
