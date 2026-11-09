import { test } from 'node:test';
import { execFileSync } from 'node:child_process';

test('site sections require a default at typecheck time', () => {
  execFileSync(process.execPath, ['node_modules/typescript/bin/tsc', '-p', 'test/blocks/tsconfig.json'], { stdio: 'pipe' });
});
