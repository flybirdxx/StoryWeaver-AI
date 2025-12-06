/**
 * API Key 掩码处理工具
 * 用于在 UI 中安全地显示 API Key
 */

/**
 * 掩码 API Key，只显示前 8 位和后 4 位，中间用 * 替代
 * @param key - 原始 API Key
 * @param visiblePrefix - 显示的前缀长度（默认 8）
 * @param visibleSuffix - 显示的后缀长度（默认 4）
 * @returns 掩码后的 Key
 */
export function maskApiKey(
  key: string,
  visiblePrefix: number = 8,
  visibleSuffix: number = 4
): string {
  if (!key || key.length === 0) {
    return '';
  }

  // 如果 Key 太短，直接全部掩码
  if (key.length <= visiblePrefix + visibleSuffix) {
    return '*'.repeat(key.length);
  }

  const prefix = key.substring(0, visiblePrefix);
  const suffix = key.substring(key.length - visibleSuffix);
  const maskedLength = key.length - visiblePrefix - visibleSuffix;
  const masked = '*'.repeat(Math.min(maskedLength, 20)); // 最多显示 20 个 *

  return `${prefix}${masked}${suffix}`;
}

/**
 * 检查 API Key 是否已掩码
 * @param key - 要检查的 Key
 * @returns 是否为掩码格式
 */
export function isMasked(key: string): boolean {
  return key.includes('*') && key.length > 12;
}

