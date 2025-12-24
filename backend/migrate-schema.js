import pg from 'pg'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.join(__dirname, '.env') })

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
})

async function migrateSchema() {
  try {
    console.log('Connecting to database...')

    // Drop old tables
    console.log('Dropping old tables...')
    await pool.query('DROP TABLE IF EXISTS messages CASCADE')
    await pool.query('DROP TABLE IF EXISTS conversations CASCADE')
    await pool.query('DROP TABLE IF EXISTS magic_link_tokens CASCADE')
    await pool.query('DROP TABLE IF EXISTS users CASCADE')

    // Create new schema
    console.log('Creating new schema...')

    // Users table with username
    await pool.query(`
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Conversations table
    await pool.query(`
      CREATE TABLE conversations (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        book_title TEXT NOT NULL,
        book_author TEXT NOT NULL,
        author_knowledge TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Messages table
    await pool.query(`
      CREATE TABLE messages (
        id SERIAL PRIMARY KEY,
        conversation_id INTEGER REFERENCES conversations(id) ON DELETE CASCADE,
        role VARCHAR(50) NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Indexes
    await pool.query('CREATE INDEX idx_conversations_user_id ON conversations(user_id)')
    await pool.query('CREATE INDEX idx_conversations_updated_at ON conversations(updated_at DESC)')
    await pool.query('CREATE INDEX idx_messages_conversation_id ON messages(conversation_id)')
    await pool.query('CREATE INDEX idx_messages_created_at ON messages(created_at)')

    console.log('✅ Database migration completed successfully!')
    console.log('All old data has been removed.')
    console.log('New tables created:')
    console.log('  - users (with username, password_hash)')
    console.log('  - conversations')
    console.log('  - messages')

  } catch (error) {
    console.error('❌ Error migrating database:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

migrateSchema()
