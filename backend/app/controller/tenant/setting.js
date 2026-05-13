const Tenant = require('../../models/tenant');
const Helper = require('../../helper/helper');

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
