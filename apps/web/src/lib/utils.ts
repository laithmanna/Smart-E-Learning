import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';
const STATIC_BASE = API_URL.replace(/\/api\/?$/, '');

/** Build a URL for a relative upload path stored in the DB (e.g. "uploads/trainer-photos/x.png"). */
export function uploadUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined;
  return `${STATIC_BASE}/${path.replace(/^\/+/, '')}`;
}
