import { cp, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const functionsDir = path.resolve(scriptsDir, '..');
const repositoryRoot = path.resolve(functionsDir, '..');
const clientDist = path.resolve(repositoryRoot, 'client/dist');
const functionsDist = path.resolve(functionsDir, 'dist');
const npmCli = process.env.npm_execpath;

if (!npmCli) throw new Error('Run the Functions build through npm.');

function runNodeScript(
  scriptPath: string,
  args: string[],
  env: NodeJS.ProcessEnv = process.env,
): void {
  const result = spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: repositoryRoot,
    env,
    stdio: 'inherit',
  });

  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Build command failed with exit code ${result.status}.`);
}

runNodeScript(npmCli, ['run', 'build', '--workspace', 'client'], {
  ...process.env,
  TAMARCADO_SKIP_SENTRY_UPLOAD: 'true',
});

runNodeScript(path.resolve(repositoryRoot, 'node_modules/typescript/bin/tsc'), [
  '-p',
  path.resolve(functionsDir, 'tsconfig.json'),
]);

const clientOutput = path.resolve(functionsDist, 'client');
const serverOutput = path.resolve(functionsDist, 'server');

await Promise.all([
  rm(clientOutput, { recursive: true, force: true }),
  rm(serverOutput, { recursive: true, force: true }),
]);
await mkdir(functionsDist, { recursive: true });
await Promise.all([
  cp(path.resolve(clientDist, 'client'), clientOutput, { recursive: true }),
  cp(path.resolve(clientDist, 'server'), serverOutput, { recursive: true }),
]);
