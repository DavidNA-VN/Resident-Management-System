const { Client } = require('pg');
require('dotenv').config();

async function checkDatabase() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Check if requests table exists
    const tableResult = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = 'requests'
    `);

    if (tableResult.rows.length > 0) {
      console.log('✅ Bang requests da ton tai');

      // Check columns
      const columnsResult = await client.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'requests'
        ORDER BY ordinal_position
      `);

      console.log('Columns:', columnsResult.rows.map(c => c.column_name));

      // Check if targetHouseholdId column exists
      const hasTargetHouseholdId = columnsResult.rows.some(c => c.column_name === 'targetHouseholdId');
      console.log('targetHouseholdId column exists:', hasTargetHouseholdId);

      // Check type constraint
      const constraintResult = await client.query(`
        SELECT conname, condef
        FROM pg_constraint
        WHERE conrelid = 'requests'::regclass
        AND contype = 'c'
      `);

      console.log('Constraints:', constraintResult.rows);

    } else {
      console.log('❌ Bang requests chua ton tai');
    }

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

checkDatabase();
