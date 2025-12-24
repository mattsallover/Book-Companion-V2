import pg from 'pg'
import dotenv from 'dotenv'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.join(__dirname, '.env') })

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
})

async function initializeDatabase() {
  try {
    console.log('Connecting to database...')

    const schema = readFileSync(path.join(__dirname, 'schema.sql'), 'utf8')

    console.log('Running schema...')
    await pool.query(schema)

    console.log('✅ Database initialized successfully!')
    console.log('Tables created:')
    console.log('  - users')
    console.log('  - conversations')
    console.log('  - messages')

  } catch (error) {
    console.error('❌ Error initializing database:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

initializeDatabase()
