const LetterData = require('../../models/letter_data');
const Helper = require('../../helper/helper');

exports.saveLetterData = async (req, res) => {
    const { employeeId, type, data } = req.body;
    const tenantId = req.users && req.users.tenantId;
    const branchId = req.users && req.users.branchId;

    if (!branchId) {
        return Helper.response(false, 'branchId is required!', {}, res, 200);
    }
    if (!employeeId || !type || !data) {
        return Helper.response(false, 'employeeId, type and data are required', {}, res, 400);
    }

    try {
        const existing = await LetterData.findOne({ where: { tenantId, branchId, employeeId, type } });

        if (existing) {
            existing.data = data;
            existing.updatedBy = req.users && req.users.id;
            await existing.save();
            return Helper.response(true, 'Letter data updated successfully', existing, res, 200);
        }

        const record = await LetterData.create({
            tenantId,
            branchId,
            employeeId,
            type,
            data,
            createdBy: req.users && req.users.id,
            updatedBy: req.users && req.users.id
        });

        return Helper.response(true, 'Letter data saved successfully', record, res, 201);
    } catch (error) {
        console.error('Error saving letter data:', error);
        return Helper.response(false, 'Internal server error', {}, res, 500);
    }
};

exports.getLetterStats = async (req, res) => {
    const tenantId = req.users && req.users.tenantId;
    const branchId = req.users && req.users.branchId;

    if (!branchId) {
        return Helper.response(false, 'branchId is required!', {}, res, 200);
    }

    try {
        const records = await LetterData.findAll({
            where: { tenantId, branchId },
            attributes: ['employeeId', 'type', 'updatedAt']
        });

        const counts = { appointment: 0, nda: 0, relieving: 0, offer: 0 };
        const employeeMap = {};

        records.forEach(r => {
            counts[r.type] = (counts[r.type] || 0) + 1;
            if (!employeeMap[r.employeeId]) employeeMap[r.employeeId] = {};
            employeeMap[r.employeeId][r.type] = r.updatedAt;
        });

        return Helper.response(true, 'Letter stats fetched', { counts, employeeMap }, res, 200);
    } catch (error) {
        console.error('Error fetching letter stats:', error);
        return Helper.response(false, 'Internal server error', {}, res, 500);
    }
};

exports.getLetterData = async (req, res) => {
    const { employeeId, type } = req.body;
    const tenantId = req.users && req.users.tenantId;
    const branchId = req.users && req.users.branchId;

    if (!branchId) {
        return Helper.response(false, 'branchId is required!', {}, res, 200);
    }
    if (!employeeId || !type) {
        return Helper.response(false, 'employeeId and type are required', {}, res, 400);
    }

    try {
        const record = await LetterData.findOne({ where: { tenantId, branchId, employeeId, type } });

        if (!record) {
            return Helper.response(false, 'No data found', {}, res, 404);
        }

        return Helper.response(true, 'Letter data fetched successfully', record.data, res, 200);
    } catch (error) {
        console.error('Error fetching letter data:', error);
        return Helper.response(false, 'Internal server error', {}, res, 500);
    }
};
