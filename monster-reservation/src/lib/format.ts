/** 입력 도중 한국 휴대폰 형식으로 자동 하이픈 (010-1234-5678). */
export function formatKoreanPhone(input: string): string {
  const digits = input.replace(/\D/g, '').slice(0, 11);
  if (digits.length === 0) return '';
  // 02 (서울)
  if (digits.startsWith('02')) {
    if (digits.length <= 2) return digits;
    if (digits.length <= 5) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
    if (digits.length <= 9) return `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`;
    return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  // 일반 (010, 070, 031 등 3자리 국번)
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  if (digits.length <= 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

/** 010-1234-5678 → 11자리만 추출. */
export function stripPhoneDigits(input: string): string {
  return input.replace(/\D/g, '');
}

/** 한국 휴대폰 유효성 (010/011 등 11자리, 02XX 10자리 등). */
export function isValidKoreanPhone(input: string): boolean {
  const d = stripPhoneDigits(input);
  if (d.startsWith('02')) return d.length === 9 || d.length === 10;
  if (d.startsWith('01')) return d.length === 10 || d.length === 11;
  if (/^0[3-9]\d/.test(d)) return d.length === 10 || d.length === 11;
  return false;
}

/** 이메일 형식 간단 검증. */
export function isValidEmail(input: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.trim());
}
