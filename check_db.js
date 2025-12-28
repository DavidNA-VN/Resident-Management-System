require('dotenv').config({ path: './backend/.env' });
const { query } = require('./backend/backend/src/db');
const path = require('path');

// Đảm bảo đường dẫn đúng
console.log('Working directory:', process.cwd());
console.log('Script location:', __filename);

async function checkRequestsTable() {
  try {
    const result = await query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = 'requests'
    `);

    if (result.rows.length > 0) {
      console.log('✅ Bảng requests đã tồn tại trong database');
      console.log('Bạn có thể sử dụng hệ thống yêu cầu ngay bây giờ!');
    } else {
      console.log('❌ Bảng requests chưa tồn tại trong database');
      console.log('');
      console.log('Cần cập nhật database. Bạn có 2 cách:');
      console.log('');
      console.log('Cách 1: Tạo lại database từ file schema mới');
      console.log('  1. Xóa database hiện tại');
      console.log('  2. Tạo database mới');
      console.log('  3. Chạy file: database/migrations/000_initial_schema_postgresql.sql');
      console.log('');
      console.log('Cách 2: Chạy migration để thêm bảng requests');
      console.log('  Chạy SQL sau trong PostgreSQL:');
      console.log('');
      console.log(`-- Thêm bảng requests
CREATE TABLE IF NOT EXISTS requests (
    id SERIAL PRIMARY KEY,
    \"requesterUserId\" INTEGER NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('ADD_NEWBORN')),
    payload JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    \"rejectionReason\" TEXT,
    \"reviewedBy\" INTEGER,
    \"reviewedAt\" TIMESTAMP,
    \"createdAt\" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    \"updatedAt\" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_requests_requester FOREIGN KEY (\"requesterUserId\") REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_requests_reviewer FOREIGN KEY (\"reviewedBy\") REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_requests_requester ON requests(\"requesterUserId\");
CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status);
CREATE INDEX IF NOT EXISTS idx_requests_type ON requests(type);
CREATE INDEX IF NOT EXISTS idx_requests_created_at ON requests(\"createdAt\");
`);
    }
  } catch (err) {
    console.error('❌ Lỗi kết nối database:', err.message);
    console.log('');
    console.log('Hãy đảm bảo:');
    console.log('1. Database PostgreSQL đang chạy');
    console.log('2. Thông tin kết nối trong backend/src/db.ts chính xác');
    console.log('3. Database đã được tạo');
  }
}

checkRequestsTable();
