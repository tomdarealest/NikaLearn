/**
 * Run interview-schema.sql against Supabase Postgres.
 *
 * Usage:
 *   DATABASE_URL="postgresql://..." node scripts/run-interview-schema.js
 *   # or with linked Supabase CLI:
 *   npx supabase link --project-ref <ref>
 *   npx supabase db query --linked -f database/interview-schema.sql
 */

require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SQL_FILE = path.join(__dirname, '..', 'database', 'interview-schema.sql');

async function runWithPg() {
  const dbUrl = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
  if (!dbUrl) return false;

  let Client;
  try {
    Client = require('pg').Client;
  } catch {
    console.log('Installing pg...');
    execSync('npm install pg --no-save', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
    Client = require('pg').Client;
  }

  const sql = fs.readFileSync(SQL_FILE, 'utf8');
  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();
  await client.query(sql);
  await client.end();
  return true;
}

async function main() {
  console.log('📦 Running interview schema migration...\n');

  try {
    execSync(`npx supabase db query --linked -f "${SQL_FILE}"`, {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..'),
    });
    console.log('\n✅ Migration complete (supabase linked).');
    return;
  } catch {
    console.log('ℹ️  Supabase linked query skipped (not linked or no access token).');
  }

  try {
    const ok = await runWithPg();
    if (ok) {
      console.log('\n✅ Migration complete (DATABASE_URL).');
      return;
    }
  } catch (err) {
    console.error('❌ pg migration failed:', err.message);
  }

  console.log('\n⚠️  Auto-migration failed. Run manually:');
  console.log('   Supabase Dashboard → SQL Editor → paste database/interview-schema.sql');
  process.exit(1);
}

main();
