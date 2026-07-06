// ---------------------------------------------------------------------------
// Feature-script dispatcher.
//
//   npm run script <module>/<feature> [args...]   run one feature
//   npm run script all                            run every read script (smoke)
//   npm run script                                list available scripts
//
// Each feature file under scripts/<module>/ exports:
//   export const meta = { summary: string };
//   export default async function run(ctx, args): Promise<void>;
// ---------------------------------------------------------------------------
/* eslint-disable no-console */
import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  createContext,
  type FeatureScript,
  type ScriptMeta,
} from './lib/context';

const SCRIPTS_DIR = __dirname;

// The read-only feature set run by `all` / `npm run smoke`. Write scripts
// (e.g. meteora/open-position) are excluded — they need a funded wallet.
const SMOKE_SET = [
  'solana/decimals',
  'solana/balances',
  'jupiter/price',
  'jupiter/trending',
  'meteora/active-bin',
  'meteora/positions',
  'flash/markets',
  'flash/quote',
];

interface LoadedScript {
  default: FeatureScript;
  meta?: ScriptMeta;
}

/** A one-line param signature, e.g. `<owner> [mint...]`, from a script's meta. */
function signature(meta?: ScriptMeta): string {
  return (meta?.params ?? []).map((p) => p.name).join(' ');
}

/** Print full usage for one script (its summary, signature, and each param). */
function printUsage(name: string, meta?: ScriptMeta): void {
  console.log(`\n  ${name} — ${meta?.summary ?? ''}`);
  console.log(`\n  usage: npm run script ${name} ${signature(meta)}`.trimEnd());
  const params = meta?.params ?? [];
  if (params.length) {
    console.log('\n  parameters:');
    const pad = Math.max(...params.map((p) => p.name.length));
    for (const p of params) console.log(`    ${p.name.padEnd(pad)}  ${p.desc}`);
  }
  console.log();
}

/** Every runnable feature file, as `module/feature` keys, sorted. */
function discover(): string[] {
  const out: string[] = [];
  for (const mod of readdirSync(SCRIPTS_DIR)) {
    const modPath = join(SCRIPTS_DIR, mod);
    if (mod === 'lib' || !statSync(modPath).isDirectory()) continue;
    for (const file of readdirSync(modPath)) {
      if (file.endsWith('.ts')) out.push(`${mod}/${file.replace(/\.ts$/, '')}`);
    }
  }
  return out.sort();
}

async function load(name: string): Promise<LoadedScript> {
  const file = join(SCRIPTS_DIR, `${name}.ts`);
  return (await import(pathToFileURL(file).href)) as LoadedScript;
}

async function listAll(): Promise<void> {
  console.log('Available scripts (run: npm run script <name> [params]):');
  console.log('Add --help to any script to see its parameters.\n');
  for (const name of discover()) {
    let meta: ScriptMeta | undefined;
    try {
      meta = (await load(name)).meta;
    } catch {
      /* ignore load errors while listing */
    }
    const sig = signature(meta);
    console.log(`  ${`${name} ${sig}`.trim().padEnd(40)} ${meta?.summary ?? ''}`);
  }
  console.log(`\n  ${'all'.padEnd(40)} run every read script as a smoke pass`);
}

async function runOne(name: string, args: string[]): Promise<void> {
  const script = await load(name).catch(() => {
    throw new Error(`unknown script "${name}". Run \`npm run script\` to list them.`);
  });
  if (typeof script.default !== 'function') {
    throw new Error(`script "${name}" has no default export function.`);
  }
  if (args[0] === '--help' || args[0] === '-h') {
    return printUsage(name, script.meta);
  }
  console.log(`\n▶ ${name}${args.length ? ' ' + args.join(' ') : ''}\n`);
  await script.default(createContext(), args);
}

async function main(): Promise<void> {
  const [target, ...args] = process.argv.slice(2);

  if (!target) return listAll();

  if (target === 'all') {
    for (const name of SMOKE_SET) {
      await runOne(name, []);
    }
    console.log('\n✓ smoke pass complete.');
    return;
  }

  // Normalize a possible leading "scripts/" and .ts suffix from tab-completion.
  const name = relative('.', target)
    .replace(/^scripts\//, '')
    .replace(/\.ts$/, '');
  await runOne(name, args);
}

main().catch((e) => {
  console.error('\n✗', (e as Error).message);
  process.exit(1);
});
