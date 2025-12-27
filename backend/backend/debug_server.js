console.log('Starting debug server...');

try {
  console.log('Loading dotenv...');
  require('dotenv').config();
  console.log('PORT:', process.env.PORT);
  console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);

  console.log('Loading express...');
  const express = require('express');

  console.log('Creating app...');
  const app = express();

  console.log('Setting up middleware...');
  app.use(require('cors')({ origin: ["http://localhost:5173"], credentials: true }));
  app.use(express.json());

  console.log('Setting up routes...');
  app.get('/api/health', (req, res) => {
    console.log('Health endpoint called');
    res.json({ success: true, message: 'Debug server running' });
  });

  app.get('/api/health/db', async (req, res) => {
    try {
      console.log('DB health endpoint called');
      const { Pool } = require('pg');
      const pool = new Pool({ connectionString: process.env.DATABASE_URL });
      const result = await pool.query('SELECT NOW()');
      await pool.end();
      res.json({ success: true, data: { now: result.rows[0].now } });
    } catch (error) {
      console.error('DB health error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  console.log('Starting server...');
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`✅ Debug server running on http://localhost:${PORT}`);
  });

} catch (error) {
  console.error('❌ Startup error:', error);
  process.exit(1);
}

