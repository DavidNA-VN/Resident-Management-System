// Test script để kiểm tra normalizeDateOnly function
// Chạy: node test_date_normalize.js

console.log('=== TEST normalizeDateOnly FUNCTION ===');

// Giả lập function từ frontend
function normalizeDateOnly(input) {
  if (!input) return "";

  try {
    // Nếu input đã là string YYYY-MM-DD thì validate và trả về
    if (typeof input === 'string') {
      if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
        const [year, month, day] = input.split('-').map(Number);
        // Validate ngày hợp lệ
        if (year >= 1900 && year <= 2100 &&
            month >= 1 && month <= 12 &&
            day >= 1 && day <= 31) {
          return input;
        }
      }

      // Nếu là ISO string (2024-12-26T00:00:00.000Z), cắt lấy date part
      if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(input)) {
        return input.substring(0, 10);
      }
    }

    // Nếu là Date object, chuyển thành YYYY-MM-DD theo local date
    if (input instanceof Date && !isNaN(input.getTime())) {
      const year = input.getFullYear();
      const month = String(input.getMonth() + 1).padStart(2, '0');
      const day = String(input.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    return "";
  } catch (error) {
    console.warn('Error normalizing date-only:', error, input);
    return "";
  }
}

// Test cases
const testCases = [
  { input: '2024-12-25', expected: '2024-12-25', desc: 'YYYY-MM-DD format' },
  { input: '2024-12-25T00:00:00.000Z', expected: '2024-12-25', desc: 'ISO string UTC' },
  { input: '2024-12-25T17:00:00.000Z', expected: '2024-12-25', desc: 'ISO string khác timezone' },
  { input: '2005-12-01', expected: '2005-12-01', desc: 'User test case' },
  { input: '', expected: '', desc: 'Empty string' },
  { input: null, expected: '', desc: 'Null input' },
  { input: undefined, expected: '', desc: 'Undefined input' },
  { input: new Date('2024-12-25'), expected: '2024-12-25', desc: 'Date object' },
  { input: 'invalid-date', expected: '', desc: 'Invalid date string' },
];

console.log('\n--- Testing normalizeDateOnly ---');
testCases.forEach((test, index) => {
  const result = normalizeDateOnly(test.input);
  const status = result === test.expected ? '✅' : '❌';
  console.log(`${status} Test ${index + 1}: ${test.desc}`);
  console.log(`   Input: ${JSON.stringify(test.input)}`);
  console.log(`   Expected: ${JSON.stringify(test.expected)}`);
  console.log(`   Got: ${JSON.stringify(result)}`);
  if (result !== test.expected) {
    console.log(`   ❌ FAILED!`);
  }
});

console.log('\n=== TEST COMPLETED ===');
console.log('\nExpected results:');
console.log('- All tests should pass ✅');
console.log('- No timezone conversion issues');
console.log('- Date-only fields handled correctly');
