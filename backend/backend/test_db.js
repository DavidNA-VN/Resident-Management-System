require('dotenv').config();
const { Pool } = require('pg');

console.log('Testing database connection...');
console.log('DATABASE_URL:', process.env.DATABASE_URL);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function testConnection() {
  try {
    const result = await pool.query('SELECT NOW()');
    console.log('✅ Database connected successfully!');
    console.log('Current time:', result.rows[0].now);
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
  } finally {
    await pool.end();
  }
}

testConnection();



