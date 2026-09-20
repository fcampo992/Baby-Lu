// scripts/apply-variants-migration.mjs
// Applies the add_product_variants migration directly via @libsql/client

import { createClient } from '@libsql/client'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Read DATABASE_URL from .env manually
const envPath = join(__dirname, '..', '.env')
const envContent = readFileSync(envPath, 'utf-8')
const match = envContent.match(/DATABASE_URL\s*=\s*"(.+)"/)
if (!match) {
  console.error('DATABASE_URL not found in .env')
  process.exit(1)
}

const dbUrl = match[1]
console.log('Connecting to:', dbUrl)

const client = createClient({ url: dbUrl })

const sql = readFileSync(
  join(__dirname, '..', 'prisma', 'migrations', '20260920000000_add_product_variants', 'migration.sql'),
  'utf-8'
)

// Split by statement-terminating semicolons and run each
const statements = sql
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith('--'))

let applied = 0
let skipped = 0

for (const stmt of statements) {
  try {
    await client.execute(stmt)
    applied++
    console.log('✓', stmt.split('\n')[0].slice(0, 80))
  } catch (err) {
    if (
      err.message?.includes('already exists') ||
      err.message?.includes('duplicate column')
    ) {
      skipped++
      console.log('⟳ Already exists (skipped):', stmt.split('\n')[0].slice(0, 80))
    } else {
      console.error('✗ Error:', err.message)
      console.error('  Statement:', stmt.slice(0, 200))
      process.exit(1)
    }
  }
}

console.log(`\nDone. Applied: ${applied}, Skipped: ${skipped}`)
client.close()
