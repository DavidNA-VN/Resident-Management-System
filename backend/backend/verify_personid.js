const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:Cuong123@localhost:5432/ktpm',
});

async function verifyPersonId() {
  try {
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'personId'
    `);

    if (result.rows.length > 0) {
      console.log('✅ personId column exists:', result.rows[0]);
    } else {
      console.log('❌ personId column still missing');
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

verifyPersonId();



