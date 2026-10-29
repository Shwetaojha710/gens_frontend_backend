const multer = require('multer');
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const Helper = require("../helper/helper");

/** Company logo upload: PNG / JPG only (PDF + Word safe), max 2 MB, stored in /upload like other files. */
const LOGO_MAX_SIZE = 2 * 1024 * 1024;
const LOGO_TYPES = ['image/png', 'image/jpeg', 'image/jpg'];
const LOGO_EXTS = ['.png', '.jpg', '.jpeg'];

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../../upload'));
    },
    filename: (req, file, cb) => {
        cb(null, uuidv4() + "_" + Date.now() + path.extname(file.originalname).toLowerCase());
    }
});

const fileFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (LOGO_TYPES.includes(file.mimetype) && LOGO_EXTS.includes(ext)) {
        cb(null, true);
    } else {
        cb(new Error('Logo must be a PNG or JPG image'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: LOGO_MAX_SIZE }
});

/**
 * Returns middleware for one logo field (req.file) or several (req.files[name][0]);
 * rejects bad files with a 400 response.
 */
const logoUpload = (fieldNames) => (req, res, next) => {
    const handler = Array.isArray(fieldNames)
        ? upload.fields(fieldNames.map((name) => ({ name, maxCount: 1 })))
        : upload.single(fieldNames);
    handler(req, res, (err) => {
        if (!err) return next();
        const message = err.code === 'LIMIT_FILE_SIZE'
            ? 'Logo must be 2 MB or smaller'
            : (err.message || 'Invalid logo file');
        return Helper.response(false, message, {}, res, 400);
    });
};

/** Uploaded file for a field, whichever of single()/fields() was used. */
logoUpload.fileOf = (req, fieldName) => {
    if (req.file && req.file.fieldname === fieldName) return req.file;
    return req.files?.[fieldName]?.[0] || null;
};

/** Every file uploaded on this request. */
logoUpload.allFiles = (req) => [
    ...(req.file ? [req.file] : []),
    ...Object.values(req.files || {}).flat(),
];

module.exports = logoUpload;
