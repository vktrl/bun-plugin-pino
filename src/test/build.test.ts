import { afterAll, describe, expect, it } from 'bun:test';
import path from 'node:path';
import bunPluginPino from '../..';

import { $ } from 'bun';

it.each(['bun', 'node'] as const)(
  'should work with %s',
  async (target) => {
    const targetOut = path.join(import.meta.dir, 'dist', target);
    for (const format of ['esm', 'cjs'] as const) {
      const output = await Bun.build({
        entrypoints: [path.join(import.meta.dir, 'app.ts')],
        outdir: path.join(targetOut, format),
        plugins: [bunPluginPino({ transports: ['pino-pretty'] })],
        format,
        target,
      });
      expect(output.success).toBe(true);
      const imageName = `bun-plugin-pino-${target}-${format}`;

      const { exitCode, stderr } =
        await $`docker build -t ${imageName} -f ${import.meta.dir}/Dockerfile.${target} ${path.join(targetOut, format)}`.throws(
          false
        );
      if (exitCode === 0) {
        $`docker image rm --force ${imageName}`.throws(false);
      } else {
        console.error(stderr.toString());
      }

      expect(exitCode).toBe(0);
    }
  },
  { timeout: 120 * 1000 }
);
