import { mkdirSync } from 'fs';
import { isAbsolute, join, resolve } from 'path';

/**
 * Absolute path to the directory that holds all uploaded files.
 * Resolved from the UPLOAD_DIR env var (relative paths are resolved against cwd).
 * Defaults to <cwd>/uploads.
 */
export const UPLOADS_ROOT: string = (() => {
  const raw = process.env.UPLOAD_DIR ?? './uploads';
  return isAbsolute(raw) ? raw : resolve(process.cwd(), raw);
})();

/** Subdirectories where multer writes files. Created on startup. */
export const UPLOAD_SUBDIRS = {
  courseAttachments: 'course-attachments',
  studentCertificates: 'student-certificates',
  trainerPhotos: 'trainer-photos',
  trainerCvs: 'trainer-cvs',
} as const;

/** Absolute path to a multer destination directory. */
export function uploadDestination(subdir: string): string {
  return join(UPLOADS_ROOT, subdir);
}

/**
 * Build the value to store in the DB for a freshly uploaded file.
 * Web's `uploadUrl()` prepends the API host, hitting our `/uploads/` static prefix,
 * which Express's serve-static strips back off to find the file on disk.
 */
export function uploadDbPath(subdir: string, filename: string): string {
  return `uploads/${subdir}/${filename}`;
}

/** Convert a DB-stored path back to its absolute disk path for unlink etc. */
export function uploadDiskPath(dbPath: string): string {
  // Stored paths start with "uploads/" — strip it to get the on-disk relative path.
  const rel = dbPath.replace(/^uploads\//, '');
  return join(UPLOADS_ROOT, rel);
}

/** Create the uploads root + all subdirs (idempotent). Call once at startup. */
export function ensureUploadDirs(): void {
  mkdirSync(UPLOADS_ROOT, { recursive: true });
  for (const subdir of Object.values(UPLOAD_SUBDIRS)) {
    mkdirSync(join(UPLOADS_ROOT, subdir), { recursive: true });
  }
}
