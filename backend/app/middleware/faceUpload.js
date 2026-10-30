const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { faceDataDir } = require('../helper/faceData');

/**
 * Multer storage for employee profile / face photos.
 * Uses writable FACE_DATA_PATH (falls back to backend/upload/facedata).
 */
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    try {
      const dir = faceDataDir();
      cb(null, dir);
    } catch (err) {
      cb(err);
    }
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase() || '.jpg';
    cb(null, `${uuidv4()}${ext}`);
  },
});

const fileFilter = (_req, file, cb) => {
  if (file.mimetype && file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'), false);
  }
};

const faceUpload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

module.exports = faceUpload;
