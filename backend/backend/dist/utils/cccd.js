"use strict";
/**
 * Utility functions để xử lý CCCD (Căn cước công dân)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeCCCD = normalizeCCCD;
exports.isValidCCCD = isValidCCCD;
/**
 * Chuẩn hóa CCCD: Loại bỏ tất cả ký tự không phải số
 * Input: string (có thể chứa spaces, dashes, etc.)
 * Output: string chỉ chứa số hoặc null nếu invalid
 */
function normalizeCCCD(cccd) {
    if (!cccd)
        return null;
    try {
        // Loại bỏ tất cả ký tự không phải số
        const normalized = cccd.toString().replace(/[^0-9]/g, '');
        // Trả về null nếu sau khi normalize là empty string
        return normalized.length > 0 ? normalized : null;
    }
    catch (error) {
        console.warn('Error normalizing CCCD:', error);
        return null;
    }
}
/**
 * Validate CCCD đã normalized
 * - Chỉ chứa số
 * - Độ dài 9-12 ký tự
 */
function isValidCCCD(cccd) {
    const normalized = normalizeCCCD(cccd);
    if (!normalized)
        return false;
    return normalized.length >= 9 && normalized.length <= 12;
}
