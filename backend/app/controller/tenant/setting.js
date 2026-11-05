const Tenant = require('../../models/tenant');
const User = require('../../models/users');
const Helper = require('../../helper/helper');
const { writeAudit } = require('../../helper/auditLog');
const path = require('path');
const fs = require('fs');
const cryptoJs = require('crypto-js');
const logoUpload = require('../../middleware/logoUpload');

/** Request field / body variant → Tenant column. */
const LOGO_COLUMNS = { logo: 'image', logoDark: 'imageDark' };

function hashPassword(password) {
  return cryptoJs.SHA256(String(password)).toString();
}

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

    const existing = await Tenant.findByPk(tenantId, { attributes: ['brandColors'], raw: true });
    await Tenant.update({ brandColors }, { where: { id: tenantId } });
    await writeAudit({
      req,
      actionType: 'BRAND_COLORS_UPDATE',
      referenceId: tenantId,
      oldValue: existing?.brandColors || null,
      newValue: brandColors,
      remarks: 'Brand colors updated',
    });
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
    await writeAudit({
      req,
      actionType: 'LETTERHEAD_UPLOAD',
      referenceId: tenantId,
      oldValue: { letterhead: existing?.letterhead || null },
      newValue: { letterhead: filename },
      remarks: 'Letterhead uploaded',
    });

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
    await writeAudit({
      req,
      actionType: 'HANDBOOK_UPLOAD',
      referenceId: tenantId,
      oldValue: { handbook: existing?.handbook || null },
      newValue: { handbook: filename },
      remarks: 'Handbook uploaded',
    });

    const url = `${process.env.BASE_URL}/upload/${filename}`;
    return Helper.response(true, 'Handbook uploaded successfully', { url, filename }, res, 200);
  } catch (error) {
    console.error('uploadHandbook error:', error);
    return Helper.response(false, error.message, {}, res, 500);
  }
};

/** Company-wide insurance policy (Master) — one PDF for all employees */
exports.getInsurancePolicy = async (req, res) => {
  try {
    const tenantId = req.users?.tenantId;
    if (!tenantId) return Helper.response(false, 'User Not Found', {}, res, 404);

    const tenant = await Tenant.findByPk(tenantId, { attributes: ['insurancePolicy', 'updatedAt'], raw: true });
    const insurancePolicy = tenant?.insurancePolicy || null;
    const url = insurancePolicy ? `${process.env.BASE_URL}/upload/${insurancePolicy}` : null;
    return Helper.response(true, 'Insurance policy fetched', { url, filename: insurancePolicy, updatedAt: tenant?.updatedAt || null }, res, 200);
  } catch (error) {
    console.error('getInsurancePolicy error:', error);
    return Helper.response(false, error.message, {}, res, 500);
  }
};

exports.uploadInsurancePolicy = async (req, res) => {
  try {
    const tenantId = req.users?.tenantId;
    if (!tenantId) return Helper.response(false, 'User Not Found', {}, res, 404);
    if (!req.file) return Helper.response(false, 'No file uploaded', {}, res, 400);

    const existing = await Tenant.findByPk(tenantId, { attributes: ['insurancePolicy'], raw: true });
    if (existing?.insurancePolicy) {
      const oldPath = path.join(__dirname, '../../../upload', existing.insurancePolicy);
      try { fs.unlinkSync(oldPath); } catch (_) {}
    }

    const filename = req.file.filename;
    await Tenant.update({ insurancePolicy: filename }, { where: { id: tenantId } });
    await writeAudit({
      req,
      actionType: 'INSURANCE_POLICY_UPLOAD',
      referenceId: tenantId,
      oldValue: { insurancePolicy: existing?.insurancePolicy || null },
      newValue: { insurancePolicy: filename },
      remarks: 'Insurance policy uploaded',
    });

    const url = `${process.env.BASE_URL}/upload/${filename}`;
    return Helper.response(true, 'Insurance policy uploaded successfully', { url, filename }, res, 200);
  } catch (error) {
    console.error('uploadInsurancePolicy error:', error);
    return Helper.response(false, error.message, {}, res, 500);
  }
};

// ── Company logo (stored in Tenant.image) ───────────────────────────────────
exports.getCompanyLogo = async (req, res) => {
  try {
    const tenantId = req.users?.tenantId;
    if (!tenantId) return Helper.response(false, 'User Not Found', {}, res, 404);

    const tenant = await Tenant.findByPk(tenantId, { attributes: ['companyName', 'image', 'imageDark'], raw: true });
    if (!tenant) return Helper.response(false, 'Tenant not found', {}, res, 404);

    return Helper.response(true, 'Company logo fetched', {
      url: Tenant.logoUrl(tenant.image),
      filename: tenant.image || null,
      darkUrl: Tenant.logoUrl(tenant.imageDark),
      darkFilename: tenant.imageDark || null,
      companyName: tenant.companyName || '',
    }, res, 200);
  } catch (error) {
    console.error('getCompanyLogo error:', error);
    return Helper.response(false, error.message, {}, res, 500);
  }
};

exports.uploadCompanyLogo = async (req, res) => {
  try {
    const tenantId = req.users?.tenantId;
    if (!tenantId) return Helper.response(false, 'User Not Found', {}, res, 404);
    const uploads = logoUpload.allFiles(req);
    if (!uploads.length) return Helper.response(false, 'No file uploaded', {}, res, 400);

    const existing = await Tenant.findByPk(tenantId, { attributes: ['image', 'imageDark'], raw: true });
    if (!existing) {
      for (const f of uploads) { try { fs.unlinkSync(f.path); } catch (_) {} }
      return Helper.response(false, 'Tenant not found', {}, res, 404);
    }

    const patch = {};
    for (const [field, column] of Object.entries(LOGO_COLUMNS)) {
      const file = logoUpload.fileOf(req, field);
      if (file) patch[column] = file.filename;
    }
    const oldValue = { image: existing.image || null, imageDark: existing.imageDark || null };
    await Tenant.update(patch, { where: { id: tenantId } });

    // Delete replaced logo files only after the new ones are saved
    for (const column of Object.keys(patch)) {
      const old = oldValue[column];
      if (old && old !== patch[column]) {
        try { fs.unlinkSync(path.join(__dirname, '../../../upload', old)); } catch (_) {}
      }
    }

    const newValue = { ...oldValue, ...patch };
    await writeAudit({
      req,
      actionType: 'COMPANY_LOGO_UPLOAD',
      referenceId: tenantId,
      oldValue,
      newValue,
      remarks: 'Company logo uploaded',
    });

    return Helper.response(true, 'Company logo uploaded successfully', {
      url: Tenant.logoUrl(newValue.image),
      filename: newValue.image,
      darkUrl: Tenant.logoUrl(newValue.imageDark),
      darkFilename: newValue.imageDark,
    }, res, 200);
  } catch (error) {
    console.error('uploadCompanyLogo error:', error);
    return Helper.response(false, error.message, {}, res, 500);
  }
};

exports.removeCompanyLogo = async (req, res) => {
  try {
    const tenantId = req.users?.tenantId;
    if (!tenantId) return Helper.response(false, 'User Not Found', {}, res, 404);

    const column = req.body?.variant === 'dark' ? 'imageDark' : 'image';
    const existing = await Tenant.findByPk(tenantId, { attributes: ['image', 'imageDark'], raw: true });
    if (!existing) return Helper.response(false, 'Tenant not found', {}, res, 404);

    const oldFile = existing[column];
    if (oldFile) {
      await Tenant.update({ [column]: null }, { where: { id: tenantId } });
      const oldPath = path.join(__dirname, '../../../upload', oldFile);
      try { fs.unlinkSync(oldPath); } catch (_) {}
      await writeAudit({
        req,
        actionType: 'COMPANY_LOGO_REMOVE',
        referenceId: tenantId,
        oldValue: { [column]: oldFile },
        newValue: { [column]: null },
        remarks: column === 'imageDark' ? 'Dark company logo removed' : 'Company logo removed',
      });
    }

    const after = { ...existing, [column]: null };
    return Helper.response(true, 'Company logo removed', {
      url: Tenant.logoUrl(after.image),
      filename: after.image || null,
      darkUrl: Tenant.logoUrl(after.imageDark),
      darkFilename: after.imageDark || null,
    }, res, 200);
  } catch (error) {
    console.error('removeCompanyLogo error:', error);
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

/**
 * Admin header: update company name, login password, and/or company logo.
 * multipart optional: logo (PNG/JPG). Body: companyName?, name?, currentPassword?, newPassword?
 */
exports.updateCompanyProfile = async (req, res) => {
  try {
    const tenantId = req.users?.tenantId;
    const userId = req.users?.id;
    if (!tenantId || !userId) {
      return Helper.response(false, 'User Not Found', {}, res, 404);
    }

    const companyName =
      req.body?.companyName != null ? String(req.body.companyName).trim() : undefined;
    const name = req.body?.name != null ? String(req.body.name).trim() : undefined;
    const currentPassword =
      req.body?.currentPassword != null ? String(req.body.currentPassword) : '';
    const newPassword =
      req.body?.newPassword != null ? String(req.body.newPassword) : '';

    const tenant = await Tenant.findByPk(tenantId);
    if (!tenant) return Helper.response(false, 'Tenant not found', {}, res, 404);

    const user = await User.findOne({
      where: { id: userId, tenantId, status: 'active' },
    });
    if (!user) return Helper.response(false, 'User not found', {}, res, 404);

    const tenantPatch = {};
    const userPatch = {};
    const oldValue = {
      companyName: tenant.companyName,
      name: user.name,
      image: tenant.image || null,
    };

    if (companyName !== undefined) {
      if (!companyName) {
        return Helper.response(false, 'Company name is required', {}, res, 400);
      }
      if (companyName.length > 120) {
        return Helper.response(false, 'Company name is too long', {}, res, 400);
      }
      tenantPatch.companyName = companyName;
    }

    if (name !== undefined) {
      if (!name) {
        return Helper.response(false, 'Name is required', {}, res, 400);
      }
      if (name.length > 80) {
        return Helper.response(false, 'Name is too long', {}, res, 400);
      }
      userPatch.name = name;
    }

    if (newPassword) {
      if (newPassword.length < 6) {
        return Helper.response(false, 'New password must be at least 6 characters', {}, res, 400);
      }
      if (!currentPassword) {
        return Helper.response(false, 'Current password is required to set a new password', {}, res, 400);
      }
      const currentHash = hashPassword(currentPassword);
      if (user.password !== currentHash) {
        return Helper.response(false, 'Current password is incorrect', {}, res, 400);
      }
      userPatch.password = hashPassword(newPassword);
    }

    const logoFile = logoUpload.fileOf(req, 'logo');
    if (logoFile) {
      tenantPatch.image = logoFile.filename;
    }

    if (!Object.keys(tenantPatch).length && !Object.keys(userPatch).length) {
      return Helper.response(false, 'Nothing to update', {}, res, 400);
    }

    if (Object.keys(tenantPatch).length) {
      await tenant.update(tenantPatch);
    }
    if (Object.keys(userPatch).length) {
      await user.update(userPatch);
    }

    if (logoFile && oldValue.image && oldValue.image !== logoFile.filename) {
      try {
        fs.unlinkSync(path.join(__dirname, '../../../upload', oldValue.image));
      } catch (_) {}
    }

    await writeAudit({
      req,
      actionType: 'COMPANY_PROFILE_UPDATE',
      referenceId: tenantId,
      oldValue,
      newValue: {
        companyName: tenant.companyName,
        name: user.name,
        image: tenant.image || null,
        passwordChanged: !!userPatch.password,
      },
      remarks: 'Company profile updated from header',
    });

    return Helper.response(
      true,
      'Profile updated successfully',
      {
        companyName: tenant.companyName,
        name: user.name,
        email: user.email,
        role: user.role,
        url: Tenant.logoUrl(tenant.image),
        darkUrl: Tenant.logoUrl(tenant.imageDark),
      },
      res,
      200,
    );
  } catch (error) {
    console.error('updateCompanyProfile error:', error);
    return Helper.response(false, error.message, {}, res, 500);
  }
};
