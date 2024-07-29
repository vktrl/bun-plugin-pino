# bun-plugin-pino

### Why?

Pino uses worker threads internally. Some dependencies and any transports [need to be bundled separately](https://github.com/pinojs/pino/blob/main/docs/bundling.md) or they won't get resolved at runtime and you'll get errors like `error: unable to determine transport target for "..."`.

### How?


This plugin will bundle Pino's dependencies and transports and fixes the imports paths in the main bundle.

#### Install
```
bun add -d pino-plugin-bun
```

#### Use the JS API to build

```ts
import { bunPluginPino } from 'bun-plugin-pino';

await Bun.build({
  entrypoints: ['./src/index.ts'],
  outdir: './dist',
  plugins: [bunPluginPino({ transports: ['pino-loki'] })], // add any transports here
  ...
});
```

Output
```
./dist
├── index.js
├── thread-stream-worker.js
├── pino-file.js
└── pino-worker.js
└── [transport].js
```

### Notes
If you have several libraries that don't play well with the bundler it's probably easier to mark them as external, resolve the versions at build time, add the packages with strict versions into a runtime package json, and finally `bun install --production` in CI to get a slim node_modules. This is the workaround I'm using with a monorepo because Bun doesn't support scoped installs at this time.

### Thanks

This code is based off of [esbuild-plugin-pino](https://github.com/wd-David/esbuild-plugin-pino/) by [David Peng](https://github.com/.wd-David)