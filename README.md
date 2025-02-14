# bun-plugin-pino

### Why?

Pino uses worker threads internally. Some dependencies and any transports [need to be bundled separately](https://github.com/pinojs/pino/blob/main/docs/bundling.md) or they won't get resolved at runtime and you'll get errors like `error: unable to determine transport target for "..."`.

Do your bundles work on the machine that built them, but break in other environments like Docker? It's because Bun will resolve and and hardcode _absolute_ paths from this particular environment into the bundle. Runtime resolution of these modules will fail elsewhere.

### How?

This plugin bundles Pino's dependencies separately and fixes runtime imports in the main bundle. It supports Node and Bun targets and CJS and ESM formats.

#### Install

```
bun add -d bun-plugin-pino
```

#### Use the JS API to build

```ts
import { bunPluginPino } from 'bun-plugin-pino';

await Bun.build({
  entrypoints: ['./src/index.ts'],
  outdir: './dist',
  plugins: [
    bunPluginPino({
      transports: ['pino-loki'], // any additional transports you may be using
      // logging?: "default" | "plain" | "quiet"
    }),
  ],
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

If you have several libraries that don't play well with the bundler it's probably easier to:

1. mark them as external
2. resolve them in your build script using `import.meta.resolve('foo')`
3. add them as dependencies with strict versions to a new package.json to be used at runtime
4. `bun install --production` to get a slim runtime node_modules in a docker image or what have you

This is the workaround I'm using with a monorepo because Bun doesn't support scoped installs at the time of writing.

### Thanks

This code is based off of [esbuild-plugin-pino](https://github.com/wd-David/esbuild-plugin-pino/) by [David Peng](https://github.com/.wd-David)
