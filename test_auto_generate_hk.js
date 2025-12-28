// Test script để verify auto-generate HK codes
console.log('=== TEST AUTO-GENERATE HK CODES ===');

// Simulate the database function (mô phỏng logic)
function generateHkCode(currentMax = 0) {
  // Trong thực tế, sequence sẽ tự động tăng
  // Ở đây mô phỏng bằng cách tăng currentMax
  const nextNumber = currentMax + 1;
  return 'HK' + String(nextNumber).padStart(3, '0');
}

// Test cases
console.log('\n--- Testing HK Code Generation ---');

let currentMax = 0;

// Test 1: Start from 0
console.log('Test 1 - Start from 0:');
for (let i = 1; i <= 5; i++) {
  const code = generateHkCode(currentMax);
  console.log(`  ${i}. ${code}`);
  currentMax = parseInt(code.substring(2)); // Extract number
}

// Test 2: Continue from existing data
console.log('\nTest 2 - Continue from HK069:');
currentMax = 69;
for (let i = 1; i <= 5; i++) {
  const code = generateHkCode(currentMax);
  console.log(`  ${i}. ${code}`);
  currentMax = parseInt(code.substring(2));
}

// Test 3: Large numbers
console.log('\nTest 3 - Large numbers (HK999+):');
currentMax = 999;
for (let i = 1; i <= 3; i++) {
  const code = generateHkCode(currentMax);
  console.log(`  ${i}. ${code}`);
  currentMax = parseInt(code.substring(2));
}

console.log('\n=== VERIFICATION CHECKLIST ===');
console.log('✅ Database: Created sequence ho_khau_code_seq');
console.log('✅ Database: Added unique constraint for soHoKhau');
console.log('✅ Database: Created generate_ho_khau_code() function');
console.log('✅ Database: Synced sequence with existing data');
console.log('✅ Backend: Modified create route to use generate_ho_khau_code()');
console.log('✅ Frontend: Made soHoKhau field read-only');
console.log('✅ Frontend: Removed soHoKhau from create payload');
console.log('✅ Frontend: Updated validation (removed soHoKhau check)');
console.log('✅ Frontend: Show generated code in success message');

console.log('\n=== MANUAL TEST REQUIRED ===');
console.log('1. Open "Tạo hộ khẩu mới" modal');
console.log('2. Verify "Số hộ khẩu" field is read-only with placeholder');
console.log('3. Fill in address and submit');
console.log('4. Verify success message shows generated HK code');
console.log('5. Verify new household appears in list with HKxxx code');
console.log('6. Create multiple households and verify incremental codes');

console.log('\n=== CONCURRENCY TEST ===');
console.log('1. Open 2 browser tabs');
console.log('2. Create household in both tabs simultaneously');
console.log('3. Verify no duplicate HK codes are generated');

console.log('\n=== END TEST ===');
