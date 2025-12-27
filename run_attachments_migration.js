const { query } = require('./backend/backend/src/db');

async function runMigration() {
  try {
    console.log('Running migration: Add attachments column to tam_tru_vang...');
    await query(`ALTER TABLE tam_tru_vang ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb`);
    console.log('✅ Migration completed: Added attachments column to tam_tru_vang');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
  }
  process.exit(0);
}

runMigration();


