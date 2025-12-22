import pkg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pkg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use provided connection string or DATABASE_URL from environment
const connectionString = process.argv[2] || process.env.DATABASE_URL;

if (!connectionString) {
  console.error('Please provide DATABASE_URL as argument or set it as environment variable');
  console.error('Usage: node init-db.js <connection-string>');
  process.exit(1);
}

const pool = new Pool({
  connectionString: connectionString,
  ssl: { rejectUnauthorized: false }
});

async function initDatabase() {
  try {
    // Read the SQL file
    const sqlFile = path.join(__dirname, 'init-db.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    
    console.log('Connecting to database...');
    const client = await pool.connect();
    
    console.log('Running initialization script...');
    await client.query(sql);
    
    console.log('✅ Database initialized successfully!');
    console.log('✅ Tables created: users, conversations, messages, magic_link_tokens');
    
    client.release();
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    process.exit(1);
  }
}

initDatabase();

