const { Pool } = require('pg');
require('dotenv').config();

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('❌ Missing DATABASE_URL in .env or environment. Please create `backend/backend/.env` or set the environment variable. You can copy `backend/backend/.env.example` as a template.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: databaseUrl,
});

async function checkTablesAndColumns() {
  try {
    console.log('Checking database schema...\n');

    // Check all tables
    const tablesResult = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);

    console.log('Tables in database:');
    for (const row of tablesResult.rows) {
      console.log(`- ${row.table_name}`);
    }
    console.log('');

    // Check specific tables that backend uses
    const importantTables = ['requests', 'tam_tru_vang', 'nhan_khau', 'ho_khau', 'users'];

    for (const tableName of importantTables) {
      console.log(`=== ${tableName.toUpperCase()} TABLE ===`);
      try {
        const columnsResult = await pool.query(`
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = $1
          ORDER BY ordinal_position;
        `, [tableName]);

        if (columnsResult.rows.length === 0) {
          console.log(`❌ Table '${tableName}' does not exist or has no columns\n`);
          continue;
        }

        console.log('Columns:');
        for (const col of columnsResult.rows) {
          console.log(`  - ${col.column_name} (${col.data_type})${col.is_nullable === 'NO' ? ' NOT NULL' : ''}${col.column_default ? ` DEFAULT ${col.column_default}` : ''}`);
        }
        console.log('');
      } catch (error) {
        console.log(`❌ Error checking table '${tableName}': ${error.message}\n`);
      }
    }

  } catch (error) {
    console.error('❌ Database connection error:', error.message);
  } finally {
    await pool.end();
  }
}

checkTablesAndColumns();
