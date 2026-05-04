import fs from 'fs';
import path from 'path';
import { pool } from './index';

async function migrate() {
  const migrationsDir = path.join(__dirname, 'migrations');
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

  await pool.query(`
    CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      filename TEXT UNIQUE NOT NULL,
      run_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  for (const file of files) {
    const { rows } = await pool.query('SELECT id FROM migrations WHERE filename=$1', [file]);
    if (rows.length > 0) {
      console.log(`[migrate] skipping ${file} (already run)`);
      continue;
    }
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    console.log(`[migrate] running ${file}`);
    await pool.query(sql);
    await pool.query('INSERT INTO migrations(filename) VALUES($1)', [file]);
    console.log(`[migrate] ✓ ${file}`);
  }

  await pool.end();
  console.log('[migrate] done');
}

migrate().catch(err => {
  console.error('[migrate] failed', err);
  process.exit(1);
});
