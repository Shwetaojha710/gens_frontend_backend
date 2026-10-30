const fs = require('fs');
const path = require('path');

/**
 * Employee face / profile photos live here for attendance recognition.
 * Override with FACE_DATA_PATH / FACE_DATA_URL in env.
 *
 * Also mirrored into backend/upload so existing IMG_BASE_URL / static URLs keep working.
 */
const DEFAULT_FACE_DIR =
  process.platform === 'win32'
    ? path.join(__dirname, '../../upload/facedata')
    : '/var/www/html/gens.in/attendance/facedata';

const LEGACY_UPLOAD_DIR = path.join(__dirname, '../../upload');

function faceDataDir() {
  const dir = String(process.env.FACE_DATA_PATH || DEFAULT_FACE_DIR).trim();
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  } catch (err) {
    console.error('faceDataDir mkdir failed:', dir, err?.message || err);
  }
  return dir;
}

function faceDataFilePath(filename) {
  if (!filename) return null;
  const base = path.basename(String(filename));
  return path.join(faceDataDir(), base);
}

function legacyUploadPath(filename) {
  if (!filename) return null;
  return path.join(LEGACY_UPLOAD_DIR, path.basename(String(filename)));
}

/** Prefer facedata; fall back to legacy upload/ for older records. */
function resolveProfileImagePath(filename) {
  if (!filename) return null;
  const face = faceDataFilePath(filename);
  if (face && fs.existsSync(face)) return face;
  const legacy = legacyUploadPath(filename);
  if (legacy && fs.existsSync(legacy)) return legacy;
  return face;
}

/** Keep a copy under upload/ so express.static + IMG_BASE_URL still resolve. */
function mirrorProfileImageToUpload(filename) {
  if (!filename) return;
  const src = faceDataFilePath(filename);
  const dest = legacyUploadPath(filename);
  if (!src || !dest || !fs.existsSync(src)) return;
  try {
    if (!fs.existsSync(LEGACY_UPLOAD_DIR)) {
      fs.mkdirSync(LEGACY_UPLOAD_DIR, { recursive: true });
    }
    if (!fs.existsSync(dest)) {
      fs.copyFileSync(src, dest);
    }
  } catch (err) {
    console.error('mirrorProfileImageToUpload failed:', err?.message || err);
  }
}

function unlinkProfileImage(filename) {
  if (!filename) return;
  for (const p of [faceDataFilePath(filename), legacyUploadPath(filename)]) {
    if (p && fs.existsSync(p)) {
      try {
        fs.unlinkSync(p);
      } catch (_) {
        /* ignore */
      }
    }
  }
}

/** Public URL for a face/profile filename. */
function faceDataPublicUrl(filename) {
  if (!filename) return null;
  const name = path.basename(String(filename));
  const faceBase = String(
    process.env.FACE_DATA_URL || process.env.FACE_IMG_BASE_URL || '',
  ).replace(/\/+$/, '');
  if (faceBase) return `${faceBase}/${name}`;

  const imgBase = String(process.env.IMG_BASE_URL || '').replace(/\/+$/, '');
  if (imgBase) return `${imgBase}/${name}`;

  const site = String(process.env.BASE_URL || '')
    .replace(/\/+$/, '')
    .replace(/\/api$/i, '');
  if (site) return `${site}/attendance/facedata/${name}`;

  return `/attendance/facedata/${name}`;
}

module.exports = {
  faceDataDir,
  faceDataFilePath,
  legacyUploadPath,
  resolveProfileImagePath,
  mirrorProfileImageToUpload,
  unlinkProfileImage,
  faceDataPublicUrl,
};
