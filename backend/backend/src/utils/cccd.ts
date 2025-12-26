/**
 * Chuẩn hóa CCCD (Căn cước công dân)
 * - Trim spaces
 * - Remove all non-numeric characters
 * - Return null if empty after normalization
 */
export function normalizeCCCD(cccd: string): string | null {
  if (!cccd || typeof cccd !== 'string') {
    return null;
  }

  // Trim và loại bỏ tất cả ký tự không phải số
  const normalized = cccd.trim().replace(/[^0-9]/g, '');

  // Return null if empty after normalization
  if (normalized.length === 0) {
    return null;
  }

  return normalized;
}

/**
 * Validate normalized CCCD
 * - Must be numeric only
 * - Length between 9-12 characters
 */
export function isValidCCCD(cccd: string): boolean {
  const normalized = normalizeCCCD(cccd);
  if (!normalized) {
    return false;
  }

  // Check length (typically 9-12 digits for Vietnamese ID)
  return normalized.length >= 9 && normalized.length <= 12;
}
