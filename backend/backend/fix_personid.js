const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:Cuong123@localhost:5432/ktpm',
});

async function fixPersonIdColumn() {
  try {
    console.log('Adding personId column to users table...');

    // Add personId column if not exists
    await pool.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS "personId" INTEGER;
    `);

    console.log('✅ personId column added');

    // Add foreign key constraint if not exists
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'fk_users_person'
        ) THEN
          ALTER TABLE users
            ADD CONSTRAINT fk_users_person
            FOREIGN KEY ("personId") REFERENCES nhan_khau(id) ON DELETE SET NULL;
        END IF;
      END $$;
    `);

    console.log('✅ Foreign key constraint added');

    console.log('🎉 Migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
  } finally {
    await pool.end();
  }
}

fixPersonIdColumn();



