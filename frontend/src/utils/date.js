/**
 * Utility functions để xử lý DATE-ONLY an toàn, tuyệt đối không lệch timezone
 * Dành cho các field: ngaySinh, ngayCapCCCD, ngayDangKyThuongTru (DATE trong DB)
 */
/**
 * Normalize date-only: Chuyển đổi input thành string "YYYY-MM-DD"
 * Input có thể là: string "YYYY-MM-DD", ISO datetime, hoặc Date object
 * Output luôn là: "YYYY-MM-DD" hoặc "" (nếu invalid)
 *
 * QUAN TRỌNG: Không dùng new Date() constructor để tránh timezone conversion!
 */
export function normalizeDateOnly(input) {
    if (!input)
        return "";
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
        // (không dùng toISOString() để tránh UTC conversion!)
        if (input instanceof Date && !isNaN(input.getTime())) {
            const year = input.getFullYear();
            const month = String(input.getMonth() + 1).padStart(2, '0');
            const day = String(input.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        }
        return "";
    }
    catch (error) {
        console.warn('Error normalizing date-only:', error, input);
        return "";
    }
}
/**
 * Chuyển đổi date string từ database thành date string định dạng YYYY-MM-DD cho input
 * Database trả về DATE dưới dạng string, frontend cần đảm bảo format đúng
 */
export function formatDateForInput(dateString) {
    return normalizeDateOnly(dateString);
}
/**
 * Format date từ YYYY-MM-DD thành dd/mm/yyyy (không dùng new Date())
 * Input: "YYYY-MM-DD" string
 * Output: "dd/mm/yyyy" hoặc "" nếu invalid
 */
export function formatFromYMD(dateString) {
    if (!dateString)
        return "";
    try {
        // Validate format YYYY-MM-DD
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
            return "";
        }
        const [year, month, day] = dateString.split('-');
        // Format thành dd/mm/yyyy bằng cách đảo string (không dùng Date object)
        return `${day}/${month}/${year}`;
    }
    catch (error) {
        console.warn('Error formatting date from YMD:', error);
        return "";
    }
}
/**
 * Legacy function - giữ để tương thích
 * Format date để hiển thị theo locale Việt Nam (dd/mm/yyyy)
 * @deprecated Sử dụng formatFromYMD thay thế
 */
export function formatDateForDisplay(dateString) {
    return formatFromYMD(dateString);
}
/**
 * Parse date từ string YYYY-MM-DD thành Date object (local timezone)
 * Dùng cho các tính toán date nếu cần, nhưng tránh dùng cho hiển thị
 */
export function parseDateOnly(dateString) {
    if (!dateString)
        return null;
    try {
        // Validate format YYYY-MM-DD
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
            return null;
        }
        const [year, month, day] = dateString.split('-').map(Number);
        // Tạo Date object theo local timezone (không UTC!)
        // Constructor new Date(year, monthIndex, day) dùng local timezone
        return new Date(year, month - 1, day);
    }
    catch (error) {
        console.warn('Error parsing date-only:', error);
        return null;
    }
}
/**
 * Lấy ngày hiện tại theo định dạng YYYY-MM-DD (local date)
 */
export function getCurrentDateString() {
    const now = new Date();
    return normalizeDateOnly(now);
}
/**
 * Validate date string có đúng format YYYY-MM-DD và hợp lệ không
 */
export function isValidDateOnly(dateString) {
    return normalizeDateOnly(dateString) === dateString;
}
