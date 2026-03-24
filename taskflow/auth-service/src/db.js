const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

pool.on('connect', () => console.log('Connected to PostgreSQL'));

const initDB = async () => {
    await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(100) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      avatar VARCHAR(500),
      role VARCHAR(20) DEFAULT 'member',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      token TEXT NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
    console.log('Database initialized');
};

module.exports = { pool, initDB };
