import { test } from 'node:test';
import { ok, strictEqual } from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { lstatSync } from 'node:fs';
import { mkdtemp, rm, writeFile, cp, readdir, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// The packed package installed in a temp consumer (as test/blocks/package.test.js
// does), so these tests observe the bin the way sites run it: through the
// node_modules/.bin symlink npm and pnpm create.

/**
 * Pack this package and install its tarball in a temp consumer.
 * Removes the consumer when the test passes; retains it for diagnosis otherwise.
 */
async function installPacked(t) {
  const consumer = await mkdtemp(join(tmpdir(), 'page-builder-bin-'));
  let passed = false;
  t.after(async () => {
    if (passed) {
      await rm(consumer, { recursive: true, force: true });
    } else {
      t.diagnostic(`Consumer retained at ${consumer}`);
    }
  });
  const env = { ...process.env, ASTRO_TELEMETRY_DISABLED: '1' };
  delete env.EMDASH_TOKEN; // the no-token behaviour under test must not see one
  const packed = JSON.parse(
    execFileSync('npm', ['pack', '--json', '--pack-destination', consumer], { env, encoding: 'utf8' }),
  );
  await writeFile(join(consumer, 'package.json'), JSON.stringify({ private: true, type: 'module' }));
  execFileSync(
    'npm',
    ['install', '--offline', '--ignore-scripts', '--legacy-peer-deps', '--no-audit', '--no-fund', join(consumer, packed[0].filename)],
    { cwd: consumer, env },
  );
  // The CLI imports the emdash peer at module load; --legacy-peer-deps installs
  // no peers, so copy the worktree's pinned version and symlink its dependencies
  // (as test/blocks/package.test.js does).
  await cp(resolve('node_modules/emdash'), join(consumer, 'node_modules', 'emdash'), { recursive: true });
  for (const dependency of await readdir('node_modules')) {
    if (dependency.startsWith('.') || dependency === 'emdash' || dependency === 'emdash-plugin-page-builder') continue;
    await symlink(resolve('node_modules', dependency), join(consumer, 'node_modules', dependency), 'dir');
  }
  passed = true;
  return { consumer, env };
}

test('the installed package runs through its .bin symlink: no token prints the JSON error and exits nonzero', async (t) => {
  const { consumer, env } = await installPacked(t);
  const bin = join(consumer, 'node_modules', '.bin', 'emdash-page-builder');
  ok(lstatSync(bin).isSymbolicLink(), 'the bin must be a symlink, as npm and pnpm install it');

  const run = spawnSync(bin, ['apply', 'https://site.example'], { env, encoding: 'utf8' });

  strictEqual(run.error, undefined, run.error?.message);
  strictEqual(run.status, 1, `stdout: ${run.stdout}\nstderr: ${run.stderr}`);
  const output = JSON.parse(run.stdout);
  ok(output.errors[0].message.includes('EMDASH_TOKEN'), run.stdout);
});

test('importing the CLI module runs nothing', async (t) => {
  const { consumer, env } = await installPacked(t);
  const moduleUrl = pathToFileURL(
    join(consumer, 'node_modules', 'emdash-plugin-page-builder', 'dist', 'cli', 'main.js'),
  ).href;

  // argv[1] is a different file on disk: importing must not fire the entry guard.
  const wrapper = join(consumer, 'import-only.mjs');
  await writeFile(wrapper, `await import(${JSON.stringify(moduleUrl)});\nprocess.stdout.write('IMPORTED-ONLY');\n`);
  const wrapperRun = spawnSync(process.execPath, [wrapper], { env, encoding: 'utf8' });
  strictEqual(wrapperRun.status, 0, wrapperRun.stderr);
  strictEqual(wrapperRun.stdout, 'IMPORTED-ONLY', `the CLI ran on import: ${wrapperRun.stdout}`);

  // argv[1] missing entirely (node -e): the guard must not throw either.
  const evalRun = spawnSync(process.execPath, ['--input-type=module', '-e', `await import(${JSON.stringify(moduleUrl)})`], {
    env,
    encoding: 'utf8',
  });
  strictEqual(evalRun.status, 0, evalRun.stderr);
  strictEqual(evalRun.stdout, '', `the CLI ran on import: ${evalRun.stdout}`);
});
