// scripts/apply-variants-migration.cjs
// Applies the add_product_variants migration directly via @libsql/client

const { createClient } = require('@libsql/client')
const { readFileSync } = require('fs')
const { join } = require('path')

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

// Remove comment-only lines, split on semicolons, filter blanks
const statements = sql
  .replace(/--[^\n]*/g, '')
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0)

async function main() {
  let applied = 0
  let skipped = 0

  for (const stmt of statements) {
    try {
      await client.execute(stmt)
      applied++
      console.log('\u2713', stmt.slice(0, 100))
    } catch (err) {
      const msg = err.message || ''
      if (
        msg.includes('already exists') ||
        msg.includes('duplicate column') ||
        msg.includes('UNIQUE constraint') ||
        msg.includes('table') && msg.includes('already')
      ) {
        skipped++
        console.log('\u27F3 Already exists (skipped):', stmt.slice(0, 80))
      } else {
        console.error('\u2717 Error:', msg)
        console.error('  Statement:', stmt.slice(0, 200))
        process.exit(1)
      }
    }
  }

  console.log(`\nDone. Applied: ${applied}, Skipped: ${skipped}`)
  client.close()
}

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
