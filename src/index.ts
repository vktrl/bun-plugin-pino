import { stat } from 'node:fs/promises';
import path from 'node:path';
import type { BunPlugin } from 'bun';

import chalk from 'chalk';

export function bunPluginPino({ transports = [] }: { transports?: string[] } = {}): BunPlugin {
  return {
    name: 'pino',
    async setup(build) {
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

      console.log(chalk.green('\nBundling Pino dependencies...\n'));

      for (const [key, entry] of Object.entries(depmap)) {
        const naming = `${key.replace('/', '-')}.js`;
        const outpath = path.relative(process.cwd(), path.join(outdir, naming));
        console.log(`  ${chalk.yellow(key)}\n      ${path.relative(process.cwd(), entry)} -> ${outpath}\n`);
        const { sourcemap, minify } = build.config;
        await Bun.build({ entrypoints: [entry], outdir, naming, target: 'bun', sourcemap, minify });
      }

      let injected = false;

      build.onLoad({ filter: /\/pino\.js$/ }, async (args) => {
        if (injected) return;
        injected = true;
        const lines: string[] = [];
        lines.push('(() => {');
        lines.push("  const path = require('node:path');");
        lines.push('  const overrides = {');
        for (const dep of Object.keys(depmap)) {
          lines.push(`    '${dep}': path.resolve(import.meta.dir, '${dep.replace('/', '-')}.js'),`);
        }
        lines.push('};');
        lines.push(
          '  globalThis.__bundlerPathsOverrides = { ...(globalThis.__bundlerPathsOverrides || {}), ...overrides };'
        );
        lines.push('})();');

        lines.push(await Bun.file(args.path).text());

        console.log(chalk.green('Injected path overrides\n'));

        return { contents: lines.join('\n') };
      });
    },
  };
}
