import { randomBytes } from 'crypto';

export function generateTempPassword(): string {
  // Format: Tmp- + 8 random alphanumeric chars + ! → meets common policies
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const buf = randomBytes(8);
  let out = '';
  for (let i = 0; i < buf.length; i++) {
    const v = buf[i];
    if (v === undefined) continue;
    const idx = v % chars.length;
    out += chars[idx];
  }
  return `Tmp-${out}!`;
}
