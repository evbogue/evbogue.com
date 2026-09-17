# Vendored dependencies

Browser and server use local copies; no runtime CDN is needed for these modules.

- `anproto/`: Ev Bogue's ANProto at `ddc040ca2d4218ffea9a531202ed21efcb3abfb7`, https://github.com/evbogue/ANProto (MIT, as declared in its README). `lib/nacl-fast-es.js` retains its public-domain TweetNaCl attribution.
- `yaml.js`: APDS's bundled YAML/front-matter adapter at revision `4934fac`, https://github.com/evbogue/apds/blob/4934fac/lib/yaml.js. The upstream bundle includes Deno standard-library YAML, front-matter and TOML code (MIT).
- `andfs/`: exact core/store files from local AndFS revision `e8a32f21aaa7c66d2a0b92673e11ed0919b75145`, https://github.com/evbogue/andfs (MIT; license included). No core edits were made. Use explicit `createAndFS` instances; its unused legacy convenience API can load APDS remotely and is not used here.

Keep upstream files unchanged. App-specific upload, authorization and range handling live in `timeline/server.js`. Updating a dependency requires rechecking the signed-message and AndFS byte fixtures/tests.
