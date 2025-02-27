import { afterAll, describe, expect, it } from 'bun:test';
import path from 'node:path';
import bunPluginPino from '../..';

import { $ } from 'bun';

it.each(['bun', 'node'] as const)(
  'should work with %s',
  async (target) => {
    const outdir = path.join(import.meta.dir, 'dist', target);

    const output = await Bun.build({
      entrypoints: [path.join(import.meta.dir, 'app.ts')],
      outdir,
      plugins: [bunPluginPino({ transports: ['pino-pretty'] })],
      format: 'esm',
      target,
    });
    expect(output.success).toBe(true);
    const imageName = `bun-plugin-pino-${target}`;

    const { exitCode, stderr } =
      await $`docker build -t ${imageName} -f ${import.meta.dir}/Dockerfile.${target} ${outdir}`.throws(false);
    if (exitCode === 0) {
      $`docker image rm --force ${imageName}`.throws(false);
    } else {
      console.error(stderr.toString());
    }

    expect(exitCode).toBe(0);
  },
  { timeout: 120 * 1000 }
);
