/**
 * Utility functions để xử lý CCCD (Căn cước công dân)
 */

/**
 * Chuẩn hóa CCCD: Loại bỏ tất cả ký tự không phải số
 * Input: string (có thể chứa spaces, dashes, etc.)
 * Output: string chỉ chứa số hoặc null nếu invalid
 */
export function normalizeCCCD(cccd: string | null | undefined): string | null {
  if (!cccd) return null;

  try {
    // Loại bỏ tất cả ký tự không phải số
    const normalized = cccd.toString().replace(/[^0-9]/g, '');

    // Trả về null nếu sau khi normalize là empty string
    return normalized.length > 0 ? normalized : null;
  } catch (error) {
    console.warn('Error normalizing CCCD:', error);
    return null;
  }
}

/**
 * Validate CCCD đã normalized
 * - Chỉ chứa số
 * - Độ dài 9-12 ký tự
 */
export function isValidCCCD(cccd: string): boolean {
  const normalized = normalizeCCCD(cccd);
  if (!normalized) return false;

  return normalized.length >= 9 && normalized.length <= 12;
}