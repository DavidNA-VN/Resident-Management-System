/**
 * Utility functions để xử lý DATE-ONLY an toàn trong backend
 * Dành cho các field: ngaySinh, ngayCapCCCD, ngayDangKyThuongTru (DATE trong DB)
 */

/**
 * Normalize date-only: Chuyển đổi input thành string "YYYY-MM-DD"
 * Input có thể là: string "YYYY-MM-DD", ISO datetime, hoặc Date object
 * Output luôn là: "YYYY-MM-DD" hoặc null (nếu invalid)
 *
 * QUAN TRỌNG: Không dùng new Date() constructor để tránh timezone conversion!
 */
export function normalizeDateOnly(input: string | Date | null | undefined): string | null {
  if (!input) return null;

  try {
    // Nếu input đã là string YYYY-MM-DD thì validate và trả về
    if (typeof input === 'string') {
      if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
        const [year, month, day] = input.split('-').map(Number);
        // Validate ngày hợp lệ (basic validation)
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
    // (không dùng toISOString() để tránh UTC conversion!)
    if (input instanceof Date && !isNaN(input.getTime())) {
      const year = input.getFullYear();
      const month = String(input.getMonth() + 1).padStart(2, '0');
      const day = String(input.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    return null;
  } catch (error) {
    console.warn('Error normalizing date-only:', error, input);
    return null;
  }
}

/**
 * Lấy ngày hiện tại theo định dạng YYYY-MM-DD (local date)
 */
export function getCurrentDateString(): string | null {
  const now = new Date();
  return normalizeDateOnly(now);
}

/**
 * Chuẩn hóa date string thành định dạng YYYY-MM-DD (legacy function)
 */
export function normalizeDateString(dateString: string | null | undefined): string | null {
  return normalizeDateOnly(dateString);
}

