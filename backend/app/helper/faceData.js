const fs = require('fs');
const path = require('path');

/**
 * Employee face / profile photos for attendance recognition.
 *
 * Disk path (Linux): /var/www/html/{hostname}/attendance/facedata
 * hostname from FACE_DATA_HOST → CAN_BASE_URL → BASE_URL → IMG_BASE_URL
 * e.g. gens.in → .../gens.in/... ; gens.demoquaeretech.in → .../gens.demoquaeretech.in/...
 *
 * Override full path with FACE_DATA_PATH. Windows uses backend/upload/facedata.
 */
const FALLBACK_FACE_DIR = path.join(__dirname, '../../upload/facedata');
const LEGACY_UPLOAD_DIR = path.join(__dirname, '../../upload');

let cachedFaceDir = null;
let cachedHostname = null;

function extractHostname(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  if (!s) return null;
  try {
    const withProto = /^[a-z][a-z0-9+.-]*:\/\//i.test(s) ? s : `https://${s}`;
    const u = new URL(withProto);
    let host = (u.hostname || '').toLowerCase().replace(/^www\./, '');
    if (!host) return null;
    if (host === 'localhost' || host === '127.0.0.1') return null;
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return null; // skip LAN IPs
    return host;
  } catch {
    return null;
  }
}

/** Public site hostname for this deployment (dynamic per env). */
function siteHostname() {
  if (cachedHostname) return cachedHostname;
  const fromEnv =
    extractHostname(process.env.FACE_DATA_HOST) ||
    extractHostname(process.env.CAN_BASE_URL) ||
    extractHostname(process.env.BASE_URL) ||
    extractHostname(process.env.IMG_BASE_URL) ||
    'gens.in';
  cachedHostname = fromEnv;
  return cachedHostname;
}

function preferredFaceDir() {
  if (process.env.FACE_DATA_PATH && String(process.env.FACE_DATA_PATH).trim()) {
    return String(process.env.FACE_DATA_PATH).trim();
  }
  if (process.platform === 'win32') {
    return path.join(__dirname, '../../upload/facedata', siteHostname());
  }
  return path.posix.join('/var/www/html', siteHostname(), 'attendance', 'facedata');
}

function ensureWritableDir(dir) {
  if (!dir) return false;
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.accessSync(dir, fs.constants.W_OK);
    const probe = path.join(dir, `.face_write_${process.pid}`);
    fs.writeFileSync(probe, '1');
    fs.unlinkSync(probe);
    return true;
  } catch (err) {
    console.error('faceDataDir not writable:', dir, err?.message || err);
    return false;
  }
}

function faceDataDir() {
  if (cachedFaceDir) return cachedFaceDir;

  const preferred = preferredFaceDir();
  if (ensureWritableDir(preferred)) {
    cachedFaceDir = preferred;
    console.log('Face data directory:', cachedFaceDir);
    return cachedFaceDir;
  }

  const fallback = path.join(FALLBACK_FACE_DIR, siteHostname());
  if (preferred !== fallback && ensureWritableDir(fallback)) {
    console.warn(
      `FACE path unavailable (${preferred}) — using fallback ${fallback}`,
    );
    cachedFaceDir = fallback;
    return cachedFaceDir;
  }

  if (ensureWritableDir(FALLBACK_FACE_DIR)) {
    cachedFaceDir = FALLBACK_FACE_DIR;
    return cachedFaceDir;
  }

  cachedFaceDir = FALLBACK_FACE_DIR;
  try {
    fs.mkdirSync(FALLBACK_FACE_DIR, { recursive: true });
  } catch (_) {
    /* ignore */
  }
  return cachedFaceDir;
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

/**
 * Resolve on-disk path for a stored filename.
 * Checks: absolute path, active facedata dir, preferred env path, legacy upload/.
 */
function resolveProfileImagePath(filenameOrPath) {
  if (!filenameOrPath) return null;
  const raw = String(filenameOrPath);

  if (path.isAbsolute(raw) && fs.existsSync(raw)) return raw;

  const base = path.basename(raw);
  const face = path.join(faceDataDir(), base);
  if (fs.existsSync(face)) return face;

  const preferred = preferredFaceDir();
  if (preferred) {
    const alt = path.join(preferred, base);
    if (fs.existsSync(alt)) return alt;
  }

  // Older gens.in path (migration / mixed envs)
  const legacyHostPath = path.posix.join(
    '/var/www/html',
    'gens.in',
    'attendance',
    'facedata',
    base,
  );
  if (fs.existsSync(legacyHostPath)) return legacyHostPath;

  const legacy = legacyUploadPath(base);
  if (legacy && fs.existsSync(legacy)) return legacy;

  return face;
}

/**
 * Rename uploaded face file to empPersonal UUID: `{empId}.jpg`
 * Returns final filename, or null if source missing.
 */
function renameProfileImageToEmpId(sourcePathOrName, empId) {
  if (!sourcePathOrName || !empId) return null;
  const src = resolveProfileImagePath(sourcePathOrName);
  if (!src || !fs.existsSync(src)) {
    console.warn('renameProfileImageToEmpId: source missing', sourcePathOrName);
    return null;
  }
  const ext = path.extname(src).toLowerCase() || '.jpg';
  const finalName = `${String(empId)}${ext}`;
  const dest = path.join(faceDataDir(), finalName);

  try {
    if (path.resolve(src) !== path.resolve(dest)) {
      // Drop previous file for this emp id if present
      if (fs.existsSync(dest)) {
        try {
          fs.unlinkSync(dest);
        } catch (_) {
          /* ignore */
        }
      }
      fs.renameSync(src, dest);
      // Clean temp name from legacy upload mirror
      const tempBase = path.basename(src);
      if (tempBase !== finalName) {
        const legacyTemp = legacyUploadPath(tempBase);
        if (legacyTemp && fs.existsSync(legacyTemp)) {
          try {
            fs.unlinkSync(legacyTemp);
          } catch (_) {
            /* ignore */
          }
        }
      }
    }
    mirrorProfileImageToUpload(finalName);
    return finalName;
  } catch (err) {
    console.error('renameProfileImageToEmpId failed:', err?.message || err);
    return path.basename(src);
  }
}

/** Keep a copy under upload/ so express.static + IMG_BASE_URL still resolve. */
function mirrorProfileImageToUpload(filenameOrPath) {
  if (!filenameOrPath) return;
  const base = path.basename(String(filenameOrPath));
  const src = resolveProfileImagePath(filenameOrPath);
  const dest = legacyUploadPath(base);
  if (!src || !dest || !fs.existsSync(src)) return;
  try {
    if (!fs.existsSync(LEGACY_UPLOAD_DIR)) {
      fs.mkdirSync(LEGACY_UPLOAD_DIR, { recursive: true });
    }
    if (path.resolve(src) !== path.resolve(dest) && !fs.existsSync(dest)) {
      fs.copyFileSync(src, dest);
    }
  } catch (err) {
    console.error('mirrorProfileImageToUpload failed:', err?.message || err);
  }
}

function unlinkProfileImage(filenameOrPath) {
  if (!filenameOrPath) return;
  const base = path.basename(String(filenameOrPath));
  const candidates = new Set();
  if (path.isAbsolute(String(filenameOrPath))) {
    candidates.add(String(filenameOrPath));
  }
  candidates.add(path.join(faceDataDir(), base));
  candidates.add(path.join(preferredFaceDir(), base));
  candidates.add(legacyUploadPath(base));

  for (const p of candidates) {
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

  const host = siteHostname();
  if (host) return `https://${host}/attendance/facedata/${name}`;

  const imgBase = String(process.env.IMG_BASE_URL || '').replace(/\/+$/, '');
  if (imgBase) return `${imgBase}/${name}`;

  return `/attendance/facedata/${name}`;
}

module.exports = {
  siteHostname,
  preferredFaceDir,
  faceDataDir,
  faceDataFilePath,
  legacyUploadPath,
  resolveProfileImagePath,
  renameProfileImageToEmpId,
  mirrorProfileImageToUpload,
  unlinkProfileImage,
  faceDataPublicUrl,
};
