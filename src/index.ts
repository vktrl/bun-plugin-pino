import { stat } from 'node:fs/promises';
import path from 'node:path';
import type { BunPlugin } from 'bun';

export type BunPluginPinoOpts = { transports?: string[]; logging?: 'default' | 'plain' | 'quiet' };

export function bunPluginPino({ transports = [], logging = 'default' }: BunPluginPinoOpts = {}): BunPlugin {
  return {
    name: 'pino',
    async setup(build) {
      const yellow = (str: string) => (logging === 'default' ? `\u001b[33m${str}\u001b[0m` : str);
      const green = (str: string) => (logging === 'default' ? `\u001b[32m${str}\u001b[0m` : str);
      const print = (msg: string) => {
        if (logging !== 'quiet') console.log(msg);
      };

      const outdir = build.config.outdir || '';
      const pino = path.dirname(Bun.resolveSync('pino', import.meta.dir));
      const threadStream = path.dirname(Bun.resolveSync('thread-stream', import.meta.dir));

      const depmap: Record<string, string> = {
        'thread-stream-worker': path.join(threadStream, 'lib/worker.js'),
        'pino-worker': path.join(pino, 'lib/worker.js'),
        'pino/file': path.join(pino, 'file.js'),
      };

      /** worker-pipeline.js was removed in Pino v9.1 */
      try {
        const pinoPipelineWorker = path.join(pino, 'lib/worker-pipeline.js');
        await stat(pinoPipelineWorker);
        depmap['pino-pipeline-worker'] = pinoPipelineWorker;
      } catch (err) {
        // Ignored
      }

      for (const transport of transports) {
        depmap[transport] = Bun.resolveSync(transport, import.meta.dir);
      }

      print(green('\nBundling Pino dependencies...\n'));

      for (const [key, entry] of Object.entries(depmap)) {
        const naming = `${key.replace('/', '-')}.js`;
        const outpath = path.relative(process.cwd(), path.join(outdir, naming));
        print(`  ${yellow(key)}\n      ${path.relative(process.cwd(), entry)} -> ${outpath}\n`);
        const { sourcemap, minify } = build.config;
        await Bun.build({
          entrypoints: [entry],
          outdir,
          naming,
          target: build.config.target,
          format: build.config.format,
          sourcemap,
          minify,
        });
      }

      let injected = false;

      build.onLoad({ filter: /[\/|\\]pino\.js$/ }, async (args) => {
        if (injected) return;
        injected = true;

        if (build.config.target === 'browser') {
          throw new Error('Pino plugin is not (yet) supported in browser');
        }

        const lines: string[] = [];
        lines.push('(() => {');
        lines.push("  const path = require('node:path');");
        lines.push('  const overrides = {');
        for (const dep of Object.keys(depmap)) {
          lines.push(`    '${dep}': path.resolve('${dep.replace('/', '-')}.js'),`);
        }
        lines.push('};');
        lines.push(
          '  globalThis.__bundlerPathsOverrides = { ...(globalThis.__bundlerPathsOverrides || {}), ...overrides };'
        );
        lines.push('})();');

        lines.push(await Bun.file(args.path).text());

        print(`${green('Done')}\n`);

        return { contents: lines.join('\n') };
      });
    },
  };
}

export default bunPluginPino;
