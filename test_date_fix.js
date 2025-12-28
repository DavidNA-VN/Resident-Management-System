// Test script để kiểm tra date handling đã được fix chưa
// Chạy: node test_date_fix.js

const { normalizeDateOnly, formatDateForDisplay } = require('./frontend/src/utils/date.ts');

console.log('=== TEST DATE HANDLING FIX ===');

// Test cases
const testCases = [
  // Test normalizeDateOnly
  { input: '2024-12-25', expected: '2024-12-25', desc: 'YYYY-MM-DD format' },
  { input: '2024-12-25T00:00:00.000Z', expected: '2024-12-25', desc: 'ISO string UTC' },
  { input: '2024-12-25T17:00:00.000Z', expected: '2024-12-25', desc: 'ISO string khác timezone' },
  { input: '', expected: '', desc: 'Empty string' },
  { input: null, expected: '', desc: 'Null input' },
  { input: undefined, expected: '', desc: 'Undefined input' },

  // Test formatDateForDisplay
  { input: '2024-12-25', expectedDisplay: '25/12/2024', desc: 'Display format' },
  { input: '2005-12-01', expectedDisplay: '01/12/2005', desc: 'User test case' },
];

console.log('\n--- Testing normalizeDateOnly ---');
testCases.forEach((test, index) => {
  if (test.expected !== undefined) { // normalize test
    const result = normalizeDateOnly(test.input);
    const status = result === test.expected ? '✅' : '❌';
    console.log(`${status} Test ${index + 1}: ${test.desc}`);
    console.log(`   Input: ${JSON.stringify(test.input)}`);
    console.log(`   Expected: ${JSON.stringify(test.expected)}`);
    console.log(`   Got: ${JSON.stringify(result)}`);
    if (result !== test.expected) {
      console.log(`   ❌ FAILED!`);
    }
  }
});

console.log('\n--- Testing formatDateForDisplay ---');
testCases.forEach((test, index) => {
  if (test.expectedDisplay !== undefined) { // display test
    const result = formatDateForDisplay(test.input);
    const status = result === test.expectedDisplay ? '✅' : '❌';
    console.log(`${status} Test ${index + 1}: ${test.desc}`);
    console.log(`   Input: ${JSON.stringify(test.input)}`);
    console.log(`   Expected: ${test.expectedDisplay}`);
    console.log(`   Got: ${JSON.stringify(result)}`);
    if (result !== test.expectedDisplay) {
      console.log(`   ❌ FAILED!`);
    }
  }
});

console.log('\n=== END TEST ===');
console.log('\nĐể test thực tế:');
console.log('1. Mở trang Nhân khẩu');
console.log('2. Sửa ngày sinh thành 01/12/2005');
console.log('3. Lưu và quay lại trang Hộ khẩu');
console.log('4. Kiểm tra ngày hiển thị vẫn là 01/12/2005 (không lùi 1 ngày)');
