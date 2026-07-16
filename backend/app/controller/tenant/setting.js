const Tenant = require('../../models/tenant');
const Helper = require('../../helper/helper');
const path = require('path');
const fs = require('fs');

exports.getBrandColors = async (req, res) => {
  try {
    const tenantId = req.users?.tenantId;
    if (!tenantId) return Helper.response(false, 'User Not Found', {}, res, 404);

    const tenant = await Tenant.findByPk(tenantId, { attributes: ['brandColors'], raw: true });
    return Helper.response(true, 'Brand colors fetched', tenant?.brandColors || {}, res, 200);
  } catch (error) {
    console.error('getBrandColors error:', error);
    return Helper.response(false, error.message, {}, res, 500);
  }
};

exports.saveBrandColors = async (req, res) => {
  try {
    const tenantId = req.users?.tenantId;
    if (!tenantId) return Helper.response(false, 'User Not Found', {}, res, 404);

    const { primaryColor, sidebarColor, pageBgStart, pageBgEnd, heroBgStart, heroBgEnd } = req.body;
    const brandColors = { primaryColor, sidebarColor, pageBgStart, pageBgEnd, heroBgStart, heroBgEnd };

    await Tenant.update({ brandColors }, { where: { id: tenantId } });
    return Helper.response(true, 'Brand colors saved', brandColors, res, 200);
  } catch (error) {
    console.error('saveBrandColors error:', error);
    return Helper.response(false, error.message, {}, res, 500);
  }
};

exports.getLetterhead = async (req, res) => {
  try {
    const tenantId = req.users?.tenantId;
    if (!tenantId) return Helper.response(false, 'User Not Found', {}, res, 404);

    const tenant = await Tenant.findByPk(tenantId, { attributes: ['letterhead'], raw: true });
    const letterhead = tenant?.letterhead || null;
    const url = letterhead ? `${process.env.BASE_URL}/upload/${letterhead}` : null;

    let base64 = null;
    if (letterhead) {
      try {
        const filePath = path.join(__dirname, '../../../upload', letterhead);
        const ext = (path.extname(letterhead).slice(1) || 'png').toLowerCase();
        base64 = `data:image/${ext};base64,${fs.readFileSync(filePath).toString('base64')}`;
      } catch (_) {}
    }

    return Helper.response(true, 'Letterhead fetched', { url, base64, filename: letterhead }, res, 200);
  } catch (error) {
    console.error('getLetterhead error:', error);
    return Helper.response(false, error.message, {}, res, 500);
  }
};

exports.uploadLetterhead = async (req, res) => {
  try {
    const tenantId = req.users?.tenantId;
    if (!tenantId) return Helper.response(false, 'User Not Found', {}, res, 404);
    if (!req.file) return Helper.response(false, 'No file uploaded', {}, res, 400);

    // Delete old letterhead file if it exists
    const existing = await Tenant.findByPk(tenantId, { attributes: ['letterhead'], raw: true });
    if (existing?.letterhead) {
      const oldPath = path.join(__dirname, '../../../upload', existing.letterhead);
      try { fs.unlinkSync(oldPath); } catch (_) {}
    }

    const filename = req.file.filename;
    await Tenant.update({ letterhead: filename }, { where: { id: tenantId } });

    const url = `${process.env.BASE_URL}/upload/${filename}`;
    return Helper.response(true, 'Letterhead uploaded successfully', { url, filename }, res, 200);
  } catch (error) {
    console.error('uploadLetterhead error:', error);
    return Helper.response(false, error.message, {}, res, 500);
  }
};

exports.getHandbook = async (req, res) => {
  try {
    const tenantId = req.users?.tenantId;
    if (!tenantId) return Helper.response(false, 'User Not Found', {}, res, 404);

    const tenant = await Tenant.findByPk(tenantId, { attributes: ['handbook', 'updatedAt'], raw: true });
    const handbook = tenant?.handbook || null;
    const url = handbook ? `${process.env.BASE_URL}/upload/${handbook}` : null;
    return Helper.response(true, 'Handbook fetched', { url, filename: handbook, updatedAt: tenant?.updatedAt || null }, res, 200);
  } catch (error) {
    console.error('getHandbook error:', error);
    return Helper.response(false, error.message, {}, res, 500);
  }
};

exports.uploadHandbook = async (req, res) => {
  try {
    const tenantId = req.users?.tenantId;
    if (!tenantId) return Helper.response(false, 'User Not Found', {}, res, 404);
    if (!req.file) return Helper.response(false, 'No file uploaded', {}, res, 400);

    // Delete old handbook file if it exists
    const existing = await Tenant.findByPk(tenantId, { attributes: ['handbook'], raw: true });
    if (existing?.handbook) {
      const oldPath = path.join(__dirname, '../../../upload', existing.handbook);
      try { fs.unlinkSync(oldPath); } catch (_) {}
    }

    const filename = req.file.filename;
    await Tenant.update({ handbook: filename }, { where: { id: tenantId } });

    const url = `${process.env.BASE_URL}/upload/${filename}`;
    return Helper.response(true, 'Handbook uploaded successfully', { url, filename }, res, 200);
  } catch (error) {
    console.error('uploadHandbook error:', error);
    return Helper.response(false, error.message, {}, res, 500);
  }
};
