const Tenant = require('../../models/tenant');
const Helper = require('../../helper/helper');
const path = require('path');
const fs = require('fs');

exports.getBrandColors = async (req, res) => {
  try {
    const tenantId = req.users?.tenantId;
    if (!tenantId) return Helper.response(false, 'User Not Found', {}, res, 404);

    const tenant = await Tenant.findByPk(tenantId, { attributes: ['brandColors'], raw: true });
    let colors = tenant?.brandColors || {};
    // DbGate edits sometimes wrap the object in an array — unwrap it
    if (Array.isArray(colors)) {
      colors = colors[0] && typeof colors[0] === 'object' ? colors[0] : {};
    }
    return Helper.response(true, 'Brand colors fetched', colors || {}, res, 200);
  } catch (error) {
    console.error('getBrandColors error:', error);
    return Helper.response(false, error.message, {}, res, 500);
  }
};

exports.saveBrandColors = async (req, res) => {
  try {
    const tenantId = req.users?.tenantId;
    if (!tenantId) return Helper.response(false, 'User Not Found', {}, res, 404);

    let body = req.body || {};
    if (Array.isArray(body)) {
      body = body[0] && typeof body[0] === 'object' ? body[0] : {};
    }

    const {
      primaryColor = '#00d2b4',
      sidebarColor = '#003b5c',
      sidebarTop = '#003b5c',
      sidebarBottom = '#008e9b',
      navActiveStart = '#0081c9',
      navActiveEnd = '#00d2b4',
      promoCardBg = '#0d486b',
      promoTitleColor = '#00d2b4',
      pageBgStart = '#eaf1f6',
      pageBgEnd = '#dfe9f0',
      heroBgStart = '#0f3d4c',
      heroBgEnd = '#00b4a6',
      buttonColor = '#00b4a6',
      buttonHoverColor = '#008f84',
      landingBgStart = '#d6e4f0',
      landingBgEnd = '#fff1eb',
      loginBgStart = '#fff5f5',
      loginBgEnd = '#eaf1f6',
      loginButtonColor = '#00b4a6',
      applyTo,
    } = body;

    const brandColors = {
      primaryColor,
      sidebarColor: sidebarTop || sidebarColor,
      sidebarTop: sidebarTop || sidebarColor,
      sidebarBottom,
      navActiveStart,
      navActiveEnd,
      promoCardBg,
      promoTitleColor,
      pageBgStart,
      pageBgEnd,
      heroBgStart,
      heroBgEnd,
      buttonColor,
      buttonHoverColor,
      landingBgStart,
      landingBgEnd,
      loginBgStart,
      loginBgEnd,
      loginButtonColor,
    };
    if (applyTo && typeof applyTo === 'object') {
      brandColors.applyTo = applyTo;
    }

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
exports.getCompanyProfile = async (req, res) => {
  try {
    const tenantId = req.users?.tenantId;
    if (!tenantId) return Helper.response(false, 'User Not Found', {}, res, 404);

    const tenant = await Tenant.findByPk(tenantId, {
      attributes: ['companyName', 'companyAddress', 'image', 'productLogo'],
      raw: true
    });

    if (!tenant) return Helper.response(false, 'Tenant not found', {}, res, 404);

    const data = {
      companyName: tenant.companyName || '',
      companyAddress: tenant.companyAddress || '',
      logo: tenant.image
        ? `${process.env.BASE_URL}/upload/${tenant.image}`
        : null,
      productLogo: tenant.productLogo
        ? `${process.env.BASE_URL}/upload/${tenant.productLogo}`
        : null
    };

    return Helper.response(true, 'Company profile fetched', data, res, 200);
  } catch (error) {
    return Helper.response(false, error.message, {}, res, 500);
  }
};
