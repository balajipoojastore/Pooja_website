import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const requestedRoots = process.argv.slice(2);
const roots = (requestedRoots.length ? requestedRoots : ['apps/customer/dist', 'apps/admin/dist'])
  .map((directory) => resolve(directory));
const forbiddenNames = ['SUPABASE_SERVICE_ROLE_KEY', 'META_ACCESS_TOKEN', 'WHATSAPP_PHONE_NUMBER_ID', 'DATABASE_PASSWORD'];
const secretValues = [];
if (existsSync('.env')) {
  for (const line of readFileSync('.env', 'utf8').split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match || !forbiddenNames.includes(match[1])) continue;
    const value = match[2].trim().replace(/^['"]|['"]$/g, '');
    if (value.length >= 12) secretValues.push(value);
  }
}
const files = [];
const walk = (directory) => { for (const name of readdirSync(directory)) { const path = join(directory, name); if (statSync(path).isDirectory()) walk(path); else files.push(path); } };
for (const root of roots) { if (!existsSync(root)) throw new Error(`Build output is missing: ${root}`); walk(root); }
const findings = [];
for (const file of files) {
  const body = readFileSync(file);
  if (body.includes(0)) continue;
  const text = body.toString('utf8');
  for (const name of forbiddenNames) if (text.includes(name)) findings.push(`${file}: forbidden variable name ${name}`);
  for (const value of secretValues) if (text.includes(value)) findings.push(`${file}: matched a server-only secret value`);
}
if (findings.length) { console.error(findings.join('\n')); process.exit(1); }
console.log(`Browser bundle scan passed (${files.length} files; ${secretValues.length} configured server-only values checked without printing them).`);
