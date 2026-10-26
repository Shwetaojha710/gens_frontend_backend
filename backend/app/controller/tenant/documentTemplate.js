const DocumentTemplate = require('../../models/documentTemplate');
const GeneratedDocument = require('../../models/generatedDocument');
const empPersonal = require('../../models/empPersonal');
const Tenant = require('../../models/tenant');
const Designation = require('../../models/designation');
const Department = require('../../models/department');
const Shift = require('../../models/shift');
const Helper = require('../../helper/helper');
const { writeAudit, toPlain } = require('../../helper/auditLog');
const { paginatorScriptTag } = require('../../helper/printPaginator');
const { Op } = require('sequelize');
const fs = require('fs');
const path = require('path');
const moment = require('moment');

const BLANK = '____________';

/** Normalize assigned branches: null/[] = all branches; else UUID[]. */
function normalizeBranchIds(input) {
  if (input === null || input === undefined) return null;
  if (input === true || input === 'all') return null;
  if (!Array.isArray(input)) return null;
  const ids = [...new Set(input.map((id) => String(id || '').trim()).filter(Boolean))];
  return ids.length ? ids : null;
}

/** Template visible for a branch if unassigned (all) or branch is in branchIds. */
function templateMatchesBranch(row, branchId) {
  if (!branchId) return true;
  const ids = row?.branchIds;
  if (!ids || !Array.isArray(ids) || ids.length === 0) return true;
  return ids.map(String).includes(String(branchId));
}

const DAY_ORDER = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

/** Build "9:00 AM to 6:30 PM, Monday to Saturday." from shift day rows. */
function formatShiftTiming(shiftRows) {
  if (!Array.isArray(shiftRows) || !shiftRows.length) return BLANK;

  const working = shiftRows.filter((s) => {
    if (s.is_week_off) return false;
    const start = String(s.startTime || '');
    const end = String(s.endTime || '');
    if (!start || !end) return false;
    if (start.startsWith('00:00') && end.startsWith('00:00')) return false;
    return true;
  });
  if (!working.length) return BLANK;

  const start = moment(working[0].startTime, ['HH:mm:ss', 'HH:mm']).format('h:mm A');
  const end = moment(working[0].endTime, ['HH:mm:ss', 'HH:mm']).format('h:mm A');

  const uniqDays = [
    ...new Set(
      working
        .map((s) => s.day_of_week)
        .filter((d) => d && DAY_ORDER.includes(d)),
    ),
  ].sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b));

  let dayLabel = '';
  if (uniqDays.length === 1) {
    dayLabel = uniqDays[0];
  } else if (uniqDays.length > 1) {
    const idxs = uniqDays.map((d) => DAY_ORDER.indexOf(d));
    let consecutive = true;
    for (let i = 1; i < idxs.length; i++) {
      if (idxs[i] !== idxs[i - 1] + 1) {
        consecutive = false;
        break;
      }
    }
    dayLabel = consecutive
      ? `${uniqDays[0]} to ${uniqDays[uniqDays.length - 1]}`
      : uniqDays.join(', ');
  }

  return dayLabel ? `${start} to ${end}, ${dayLabel}.` : `${start} to ${end}.`;
}

const fmtDate = (value) => {
  if (!value) return BLANK;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) {
    // already DD/MM/YYYY style
    if (typeof value === 'string' && value.includes('/')) return value;
    return BLANK;
  }
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
};

const fmtMoney = (n) => {
  const num = Number(n || 0);
  if (!num) return BLANK;
  return `Rs. ${num.toLocaleString('en-IN', { maximumFractionDigits: 0 })}/-`;
};

const pickAmount = (items, keys) => {
  const found = items.find((item) =>
    keys.some((k) => String(item.name || '').toLowerCase().includes(k))
  );
  return found ? Number(found.amount) || 0 : 0;
};

exports.getVariableCatalog = async (_req, res) => {
  const catalog = {
    employee: [
      { key: 'employee_name', label: 'Employee Name' },
      { key: 'employee_id', label: 'Employee ID / Code' },
      { key: 'designation', label: 'Designation' },
      { key: 'department', label: 'Department' },
      { key: 'joining_date', label: 'Joining Date' },
      { key: 'employment_type', label: 'Employment Type' },
      { key: 'work_location', label: 'Work Location' },
      { key: 'reporting_manager', label: 'Reporting Manager' },
      { key: 'father_name', label: 'Father Name' },
      { key: 'permanent_address', label: 'Permanent Address' },
      { key: 'gender_title', label: 'Mr. / Ms.' },
      { key: 'relation', label: 'S/O or D/O' },
      { key: 'pan_no', label: 'PAN No' },
      { key: 'shift_name', label: 'Shift Name' },
      {
        key: 'shift_timing',
        label: 'Shift Timing (e.g. 9:00 AM to 6:30 PM, Monday to Saturday)',
      },
    ],
    salary: [
      { key: 'basic_salary', label: 'Basic Salary (monthly)' },
      { key: 'hra', label: 'HRA' },
      { key: 'special_allowance', label: 'Special / Misc Allowance' },
      { key: 'gross_salary', label: 'Gross (monthly)' },
      { key: 'monthly_ctc', label: 'Monthly CTC' },
      { key: 'annual_ctc', label: 'Annual CTC' },
      { key: 'employee_pf', label: 'Employee PF' },
      { key: 'employer_pf', label: 'Employer PF' },
      { key: 'salary_table', label: 'Salary Table (HTML)' },
    ],
    company: [
      { key: 'company_name', label: 'Company Name' },
      { key: 'company_address', label: 'Company Address' },
      { key: 'hr_name', label: 'HR Name' },
      { key: 'issue_date', label: 'Issue Date' },
    ],
  };
  return Helper.response(true, 'Variable catalog', catalog, res, 200);
};

exports.createTemplate = async (req, res) => {
  try {
    const tenantId = req.users?.tenantId;
    const branchId = req.body?.branchId || req.users?.branchId || null;
    const {
      name,
      category,
      bodyHtml,
      letterheadBlank,
      topPaddingMm,
      letterheadPages,
      letterheadHeaderMm,
      letterheadFooterMm,
      pageSize,
      defaultFontFamily,
      defaultFontSize,
      headerFooter,
      includeSalaryAnnexure,
      status,
      branchIds,
      assignAllBranches,
    } = req.body;

    if (!tenantId) return Helper.response(false, 'Unauthorized', {}, res, 401);
    if (!name || !bodyHtml) {
      return Helper.response(false, 'Name and body are required', {}, res, 400);
    }

    const assigned =
      assignAllBranches === true ? null : normalizeBranchIds(branchIds);

    const row = await DocumentTemplate.create({
      tenantId,
      branchId,
      branchIds: assigned,
      name: String(name).trim(),
      category: category || 'custom',
      bodyHtml,
      letterheadBlank:
        letterheadBlank === true ||
        letterheadBlank === 'true' ||
        letterheadBlank === 1 ||
        letterheadBlank === '1',
      topPaddingMm: normalizeTopPaddingMm(topPaddingMm),
      letterheadPages: normalizeLetterheadPages(letterheadPages),
      letterheadHeaderMm: normalizeLhBandMm(letterheadHeaderMm, 28),
      letterheadFooterMm: normalizeLhBandMm(letterheadFooterMm, 40),
      pageSize: normalizePageSize(pageSize),
      defaultFontFamily: normalizeDefaultFontFamily(defaultFontFamily),
      defaultFontSize: normalizeDefaultFontSize(defaultFontSize),
      headerFooter: normalizeHeaderFooter(headerFooter),
      includeSalaryAnnexure: !!includeSalaryAnnexure,
      status: status === 'inactive' ? 'inactive' : 'active',
      createdBy: req.users?.id,
      updatedBy: req.users?.id,
    });

    await writeAudit({
      req,
      actionType: 'DOCUMENT_TEMPLATE_CREATE',
      referenceId: row.id,
      oldValue: null,
      newValue: row,
      remarks: `Template created: ${row.name}`,
    });

    return Helper.response(true, 'Template created', row, res, 201);
  } catch (error) {
    console.error('createTemplate', error);
    return Helper.response(false, error.message, {}, res, 500);
  }
};

exports.updateTemplate = async (req, res) => {
  try {
    const tenantId = req.users?.tenantId;
    const {
      id,
      name,
      category,
      bodyHtml,
      letterheadBlank,
      topPaddingMm,
      letterheadPages,
      letterheadHeaderMm,
      letterheadFooterMm,
      pageSize,
      defaultFontFamily,
      defaultFontSize,
      headerFooter,
      includeSalaryAnnexure,
      status,
      branchIds,
      assignAllBranches,
    } = req.body;
    if (!tenantId || !id) return Helper.response(false, 'id is required', {}, res, 400);

    const row = await DocumentTemplate.findOne({ where: { id, tenantId } });
    if (!row) return Helper.response(false, 'Template not found', {}, res, 404);

    const oldTemplate = toPlain(row);

    if (name != null) row.name = String(name).trim();
    if (category != null) row.category = category;
    if (bodyHtml != null) {
      // Force dirty flag — LONGTEXT sometimes skips update when Sequelize diffs poorly
      row.set('bodyHtml', String(bodyHtml));
      row.changed('bodyHtml', true);
    }
    // Always persist letterhead choice (false = show company letterhead on edit/print)
    if (letterheadBlank !== undefined) {
      row.set(
        'letterheadBlank',
        letterheadBlank === true || letterheadBlank === 'true' || letterheadBlank === 1 || letterheadBlank === '1',
      );
      row.changed('letterheadBlank', true);
    }
    if (topPaddingMm !== undefined) {
      row.set('topPaddingMm', normalizeTopPaddingMm(topPaddingMm));
      row.changed('topPaddingMm', true);
    }
    if (letterheadPages !== undefined) {
      row.set('letterheadPages', normalizeLetterheadPages(letterheadPages));
      row.changed('letterheadPages', true);
    }
    if (letterheadHeaderMm !== undefined) {
      row.set('letterheadHeaderMm', normalizeLhBandMm(letterheadHeaderMm, 28));
      row.changed('letterheadHeaderMm', true);
    }
    if (letterheadFooterMm !== undefined) {
      row.set('letterheadFooterMm', normalizeLhBandMm(letterheadFooterMm, 40));
      row.changed('letterheadFooterMm', true);
    }
    if (pageSize !== undefined) {
      row.set('pageSize', normalizePageSize(pageSize));
      row.changed('pageSize', true);
    }
    if (defaultFontFamily !== undefined) {
      row.set('defaultFontFamily', normalizeDefaultFontFamily(defaultFontFamily));
      row.changed('defaultFontFamily', true);
    }
    if (defaultFontSize !== undefined) {
      row.set('defaultFontSize', normalizeDefaultFontSize(defaultFontSize));
      row.changed('defaultFontSize', true);
    }
    if (headerFooter !== undefined) {
      row.set('headerFooter', normalizeHeaderFooter(headerFooter));
      row.changed('headerFooter', true);
    }
    if (includeSalaryAnnexure != null) row.includeSalaryAnnexure = !!includeSalaryAnnexure;
    if (status != null) row.status = status === 'inactive' ? 'inactive' : 'active';
    if (assignAllBranches === true) {
      row.set('branchIds', null);
      row.changed('branchIds', true);
    } else if (branchIds !== undefined) {
      row.set('branchIds', normalizeBranchIds(branchIds));
      row.changed('branchIds', true);
    }
    row.updatedBy = req.users?.id;
    await row.save();

    await writeAudit({
      req,
      actionType: 'DOCUMENT_TEMPLATE_UPDATE',
      referenceId: row.id,
      oldValue: oldTemplate,
      newValue: row,
      remarks: `Template updated: ${row.name}`,
    });

    return Helper.response(true, 'Template updated', row, res, 200);
  } catch (error) {
    console.error('updateTemplate', error);
    return Helper.response(false, error.message, {}, res, 500);
  }
};

exports.listTemplates = async (req, res) => {
  try {
    const tenantId = req.users?.tenantId;
    if (!tenantId) return Helper.response(false, 'Unauthorized', {}, res, 401);

    const where = { tenantId };
    if (req.body?.status) where.status = req.body.status;
    if (req.body?.category) where.category = req.body.category;

    let rows = await DocumentTemplate.findAll({
      where,
      order: [['updatedAt', 'DESC']],
    });

    // Optional: only templates assigned to this branch (or all-branch templates)
    const filterBranchId = req.body?.branchId || null;
    if (filterBranchId) {
      rows = rows.filter((r) => templateMatchesBranch(r, filterBranchId));
    }

    return Helper.response(true, 'Templates fetched', rows, res, 200);
  } catch (error) {
    console.error('listTemplates', error);
    return Helper.response(false, error.message, {}, res, 500);
  }
};

exports.getTemplate = async (req, res) => {
  try {
    const tenantId = req.users?.tenantId;
    const { id } = req.body;
    if (!tenantId || !id) return Helper.response(false, 'id is required', {}, res, 400);

    const row = await DocumentTemplate.findOne({ where: { id, tenantId } });
    if (!row) return Helper.response(false, 'Template not found', {}, res, 404);
    return Helper.response(true, 'Template fetched', row, res, 200);
  } catch (error) {
    return Helper.response(false, error.message, {}, res, 500);
  }
};

exports.deleteTemplate = async (req, res) => {
  try {
    const tenantId = req.users?.tenantId;
    const { id } = req.body;
    if (!tenantId || !id) return Helper.response(false, 'id is required', {}, res, 400);

    const oldTemplate = await DocumentTemplate.findOne({ where: { id, tenantId }, raw: true });
    const deleted = await DocumentTemplate.destroy({ where: { id, tenantId } });
    if (!deleted) return Helper.response(false, 'Template not found', {}, res, 404);

    await writeAudit({
      req,
      actionType: 'DOCUMENT_TEMPLATE_DELETE',
      referenceId: id,
      oldValue: oldTemplate,
      newValue: null,
      remarks: `Template deleted: ${oldTemplate?.name || id}`,
    });
    return Helper.response(true, 'Template deleted', {}, res, 200);
  } catch (error) {
    return Helper.response(false, error.message, {}, res, 500);
  }
};

async function buildVariableMap(tenantId, employeeId, hrName, issueDate) {
  const emp = await empPersonal.findOne({
    where: { id: employeeId, tenantId },
    raw: true,
  });
  if (!emp) return null;

  const tenant = await Tenant.findByPk(tenantId, {
    attributes: ['companyName', 'companyAddress'],
    raw: true,
  });

  const gender = String(emp.gender || '').toLowerCase();
  const isMale = gender === 'male';

  // Resolve department / designation names from IDs
  let designationName = BLANK;
  let departmentName = BLANK;
  try {
    if (emp.designationId) {
      const desig = await Designation.findOne({
        where: { id: emp.designationId, tenantId },
        attributes: ['name'],
        raw: true,
      });
      if (desig?.name) designationName = desig.name;
    }
    if (emp.departmentId) {
      const dept = await Department.findOne({
        where: { id: emp.departmentId, tenantId },
        attributes: ['name'],
        raw: true,
      });
      if (dept?.name) departmentName = dept.name;
    }
  } catch (_) {}

  // Shift name + timing e.g. "9:00 AM to 6:30 PM, Monday to Saturday."
  let shiftName = emp.shift_id || BLANK;
  let shiftTiming = BLANK;
  try {
    if (emp.shift_id) {
      const where = { tenantId, shift: emp.shift_id };
      if (emp.branchId) where.branchId = emp.branchId;
      const shiftRows = await Shift.findAll({
        where,
        attributes: ['day_of_week', 'startTime', 'endTime', 'is_week_off', 'shift'],
        raw: true,
        order: [['day_of_week', 'ASC']],
      });
      if (shiftRows?.length) {
        shiftName = shiftRows[0].shift || emp.shift_id;
        shiftTiming = formatShiftTiming(shiftRows);
      }
    }
  } catch (_) {}

  // Soft salary lookup — ignore failures
  let salaryItems = [];
  let annualCtc = 0;
  try {
    const sequelize = require('../../connection/connection');
    // Prefer active basic/allowance rows if tables exist; otherwise leave blank
    const [basics] = await sequelize.query(
      `SELECT "component_name" as name, "finalAmount" as amount, "finalCTC" as ctc
       FROM "basics" WHERE "employeeId" = :employeeId AND "tenantId" = :tenantId AND status = 'active'
       LIMIT 50`,
      { replacements: { employeeId, tenantId } }
    ).catch(() => [[]]);
    const [allowances] = await sequelize.query(
      `SELECT "component_name" as name, "finalAmount" as amount
       FROM "allowances" WHERE "employeeId" = :employeeId AND "tenantId" = :tenantId AND status = 'active'
       LIMIT 50`,
      { replacements: { employeeId, tenantId } }
    ).catch(() => [[]]);

    const toMonthly = (row) => Math.round(Number(row.amount || 0) / 12);
    salaryItems = [
      ...(basics || []).map((r) => ({ name: r.name, amount: toMonthly(r) })),
      ...(allowances || []).map((r) => ({ name: r.name, amount: toMonthly(r) })),
    ];
    annualCtc = Number((basics || [])[0]?.ctc || 0);
  } catch (_) {
    salaryItems = [];
  }

  const basic = pickAmount(salaryItems, ['basic']);
  const hra = pickAmount(salaryItems, ['hra', 'house rent']);
  const special = pickAmount(salaryItems, ['special', 'misc']);
  const empPf = pickAmount(salaryItems, ['employee pf', 'pf employee', 'epf']);
  const erPf = pickAmount(salaryItems, ['employer pf', 'pf employer']);
  const monthlyCtc = annualCtc ? Math.round(annualCtc / 12) : salaryItems.reduce((s, i) => s + (i.amount || 0), 0);
  const gross = basic + hra + special;

  const salaryTableRows = salaryItems
    .filter((i) => i.amount > 0)
    .map(
      (i, idx) =>
        `<tr><td>${idx + 1}.</td><td>${i.name || ''}</td><td>${fmtMoney(i.amount)}</td></tr>`
    )
    .join('');
  const salaryTable = salaryTableRows
    ? `<table style="width:100%;border-collapse:collapse;font-size:10pt" border="1" cellpadding="4">
        <tr><th>#</th><th>Component</th><th>Amount</th></tr>
        ${salaryTableRows}
      </table>`
    : BLANK;

  return {
    employee_name: `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || BLANK,
    employee_id: emp.empCode || BLANK,
    designation: designationName,
    department: departmentName,
    joining_date: fmtDate(emp.joiningDate),
    employment_type: emp.empType || BLANK,
    work_location: emp.city || emp.state || tenant?.companyAddress || BLANK,
    reporting_manager: BLANK,
    father_name: emp.fatherName || BLANK,
    permanent_address: emp.permanentAddress || emp.address || BLANK,
    gender_title: isMale ? 'Mr.' : 'Ms.',
    relation: isMale ? 'S/O' : 'D/O',
    pan_no: emp.panNo || BLANK,
    shift_name: shiftName,
    shift_timing: shiftTiming,
    basic_salary: basic ? fmtMoney(basic) : BLANK,
    hra: hra ? fmtMoney(hra) : BLANK,
    special_allowance: special ? fmtMoney(special) : BLANK,
    gross_salary: gross ? fmtMoney(gross) : BLANK,
    monthly_ctc: monthlyCtc ? fmtMoney(monthlyCtc) : BLANK,
    annual_ctc: annualCtc ? fmtMoney(annualCtc) : BLANK,
    employee_pf: empPf ? fmtMoney(empPf) : BLANK,
    employer_pf: erPf ? fmtMoney(erPf) : BLANK,
    salary_table: salaryTable,
    company_name: tenant?.companyName || BLANK,
    company_address: tenant?.companyAddress || BLANK,
    hr_name: hrName || BLANK,
    issue_date: fmtDate(issueDate || new Date()),
  };
}

function fillTemplate(bodyHtml, vars) {
  return String(bodyHtml || '').replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => {
    const raw = vars[key] != null && vars[key] !== '' ? String(vars[key]) : BLANK;
    // salary_table is intentional HTML; escape everything else so layout markup stays intact
    if (key === 'salary_table') return raw;
    return raw
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  });
}

async function getLetterheadBase64(tenantId) {
  try {
    const tenant = await Tenant.findByPk(tenantId, { attributes: ['letterhead'], raw: true });
    if (!tenant?.letterhead) return null;
    const filePath = path.join(__dirname, '../../../upload', tenant.letterhead);
    if (!fs.existsSync(filePath)) return null;
    const ext = (path.extname(tenant.letterhead).slice(1) || 'png').toLowerCase();
    const mime = ext === 'jpg' ? 'jpeg' : ext;
    return `data:image/${mime};base64,${fs.readFileSync(filePath).toString('base64')}`;
  } catch (_) {
    return null;
  }
}

function wrapTrailingFooter(html) {
  const src = String(html || '');
  if (/hr-print-footer/i.test(src)) return src;
  const re =
    /((?:(?:<div\b[^>]*hr-clearfix[^>]*>\s*<\/div>\s*)|(?:<p\b[^>]*>\s*(?:&nbsp;|\u00a0|<br\s*\/?>|\s)*<\/p>\s*))*<img\b[^>]*>\s*(?:<div\b[^>]*hr-clearfix[^>]*>\s*<\/div>\s*)*){1,}\s*$/i;
  const m = src.match(re);
  if (!m || m.index == null) return src;
  if (!(m[0].match(/<img\b/gi) || []).length) return src;
  return `${src.slice(0, m.index)}<div class="hr-print-footer">${m[0]}</div>`;
}

/** Bake Quill .ql-color-* / .ql-bg-* + bold tags into inline styles for print HTML. */
function inlineQuillFormatClassesForPrint(html) {
  const COLOR = {
    white: '#fff',
    red: '#e60000',
    orange: '#f90',
    yellow: '#ff0',
    green: '#008a00',
    blue: '#06c',
    purple: '#93f',
    black: '#000',
  };
  const BG = {
    black: '#000',
    red: '#e60000',
    orange: '#f90',
    yellow: '#ff0',
    green: '#008a00',
    blue: '#06c',
    purple: '#93f',
    white: '#fff',
  };
  let out = String(html || '');
  out = out.replace(
    /<([a-z][a-z0-9]*)\b([^>]*\bclass\s*=\s*["'][^"']*\bql-(?:color|bg)-[^"']*["'][^>]*)>/gi,
    (_m, tag, attrs) => {
      let a = attrs;
      const extras = [];
      a = a.replace(/\bql-color-([a-z0-9#-]+)\b/gi, (_c, name) => {
        const hex = COLOR[String(name).toLowerCase()] || (/^#/.test(name) ? name : null);
        if (hex) extras.push(`color:${hex}`);
        return '';
      });
      a = a.replace(/\bql-bg-([a-z0-9#-]+)\b/gi, (_c, name) => {
        const hex = BG[String(name).toLowerCase()] || (/^#/.test(name) ? name : null);
        if (hex) extras.push(`background-color:${hex}`);
        return '';
      });
      a = a.replace(/class=(["'])\s*\1/gi, '');
      a = a.replace(/class=(["'])\s+/gi, 'class=$1');
      a = a.replace(/\s{2,}/g, ' ');
      if (!extras.length) return `<${tag}${attrs}>`;
      if (/style\s*=/i.test(a)) {
        a = a.replace(/style\s*=\s*(["'])/i, `style=$1${extras.join(';')};`);
      } else {
        a += ` style="${extras.join(';')}"`;
      }
      return `<${tag}${a}>`;
    }
  );
  out = out.replace(/<(strong|b)(\b[^>]*)>/gi, (_m, tag, attrs) => {
    if (/font-weight\s*:/i.test(attrs)) return `<${tag}${attrs}>`;
    if (/style\s*=/i.test(attrs)) {
      return `<${tag}${attrs.replace(/style\s*=\s*(["'])/i, 'style=$1font-weight:700;')}>`;
    }
    return `<${tag}${attrs} style="font-weight:700">`;
  });
  out = out.replace(/<(em|i)(\b[^>]*)>/gi, (_m, tag, attrs) => {
    if (/font-style\s*:/i.test(attrs)) return `<${tag}${attrs}>`;
    if (/style\s*=/i.test(attrs)) {
      return `<${tag}${attrs.replace(/style\s*=\s*(["'])/i, 'style=$1font-style:italic;')}>`;
    }
    return `<${tag}${attrs} style="font-style:italic">`;
  });
  return out;
}

/** Match Manage Template print: keep signature gaps / left-right columns. */
function normalizeQuillHtmlForPrint(html) {
  let out = String(html || '');
  const PAGE_BREAK_MARK = '<div class="page-break" data-page-break="1"></div>';
  out = out.replace(
    /<div\b[^>]*(?:class\s*=\s*["'][^"']*page-break[^"']*["']|data-page-break\s*=)[^>]*\/?>(?:[\s\S]*?<\/div>)?/gi,
    PAGE_BREAK_MARK
  );
  out = out.replace(
    /<(?:div|p)\b[^>]*class=["'][^"']*\bpage-break\b[^"']*["'][^>]*>\s*(?:<br\s*\/?>)?\s*<\/(?:div|p)>/gi,
    PAGE_BREAK_MARK
  );

  const textOf = (h) =>
    String(h || '')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;|\u00a0/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  const isSigLine = (h) => {
    const t = textOf(h);
    return /signature/i.test(t) || /^\(\s*\)$/.test(t);
  };
  const isRight = (attrs) => /ql-align-right|text-align\s*:\s*right/i.test(attrs || '');
  const isLeftish = (attrs) =>
    !isRight(attrs) && !/ql-align-center|text-align\s*:\s*center/i.test(attrs || '');

  out = out.replace(
    /<p\b([^>]*)>([\s\S]*?)<\/p>\s*<p\b([^>]*)>([\s\S]*?)<\/p>/gi,
    (full, a1, c1, a2, c2) => {
      if (!isLeftish(a1) || !isRight(a2)) return full;
      if (!isSigLine(c1) || !isSigLine(c2)) return full;
      return (
        `<table class="hr-sig-table" style="width:100%;table-layout:fixed;border-collapse:collapse;border:none;margin:0.35em 0;">` +
        `<tbody><tr>` +
        `<td style="width:50%;vertical-align:top;text-align:left;border:none;padding:0 8px 0 0;">${c1}</td>` +
        `<td style="width:50%;vertical-align:top;text-align:right;border:none;padding:0 0 0 8px;">${c2}</td>` +
        `</tr></tbody></table>`
      );
    }
  );

  out = out.replace(
    /<([a-z][a-z0-9]*)\b([^>]*\bclass\s*=\s*["'][^"']*\bql-align-(left|center|right|justify)\b[^"']*["'][^>]*)>/gi,
    (_m, tag, attrs, align) => {
      if (/text-align\s*:/i.test(attrs)) return `<${tag}${attrs}>`;
      if (/style\s*=/i.test(attrs)) {
        return `<${tag}${attrs.replace(/style\s*=\s*(["'])/i, `style=$1text-align:${align};`)}>`;
      }
      return `<${tag}${attrs} style="text-align:${align};">`;
    }
  );

  // Drop Quill / Word left indent (print was showing fake 1-tab gap)
  out = out.replace(/\bql-indent-\d+\b/gi, '');
  out = out.replace(/style\s*=\s*(["'])(.*?)\1/gi, (_m, q, style) => {
    let s = String(style)
      .replace(/margin-left\s*:\s*[^;]+;?/gi, '')
      .replace(/padding-left\s*:\s*[^;]+;?/gi, '')
      .replace(/text-indent\s*:\s*[^;]+;?/gi, '')
      .replace(/;;+/g, ';')
      .replace(/^;|;$/g, '')
      .trim();
    return s ? `style=${q}${s}${q}` : '';
  });
  out = inlineQuillFormatClassesForPrint(out);
  const leadWs = '(?:&nbsp;|\\u00a0|&#160;|\\t| ){1,24}';
  out = out.replace(new RegExp(`<(p|h[1-6]|div|li|td|th)(\\b[^>]*)>${leadWs}`, 'gi'), '<$1$2>');
  out = out.replace(
    new RegExp(
      `<(p|h[1-6]|li|td|th)(\\b[^>]*)>((?:<(?:strong|b|em|i|u|span|a|font)\\b[^>]*>)+)${leadWs}`,
      'gi'
    ),
    '<$1$2>$3'
  );
  out = out.replace(/<blockquote[^>]*>\s*/gi, '').replace(/\s*<\/blockquote>/gi, '');

  // Keep vertical margin/padding (matches editor). Only strip fake left indent + Word pt/px line-height.
  out = out.replace(/style\s*=\s*(["'])(.*?)\1/gi, (_m, q, style) => {
    let s = String(style)
      .replace(/margin-left\s*:\s*[^;]+;?/gi, '')
      .replace(/padding-left\s*:\s*[^;]+;?/gi, '')
      .replace(/text-indent\s*:\s*[^;]+;?/gi, '')
      // Keep unitless line-height from toolbar; drop Word absolute pt/px
      .replace(/line-height\s*:\s*[\d.]+(?:pt|px)\s*;?/gi, '')
      .replace(/;;+/g, ';')
      .replace(/^;|;$/g, '')
      .trim();
    return s ? `style=${q}${s}${q}` : '';
  });

  out = out.replace(/>([^<]+)</g, (_m, text) => {
    const trimmedLead = String(text).replace(/^[\s\u00a0\t]+/, '');
    const fixed = trimmedLead.replace(/ {2,}/g, (spaces) => '&nbsp;'.repeat(spaces.length));
    return `>${fixed}<`;
  });

  // Keep ql-spacer / data-vspace heights as-is (same as editor)
  return out;
}

function normalizeTopPaddingMm(value) {
  if (value == null || value === '' || value === 'auto') return null;
  const n = parseInt(value, 10);
  if (Number.isNaN(n)) return null;
  return Math.min(80, Math.max(0, n));
}

/** Letterhead header/footer band height (mm). null → default. */
function normalizeLhBandMm(value, fallback) {
  if (value == null || value === '' || value === 'auto') return fallback;
  const n = parseInt(value, 10);
  if (Number.isNaN(n)) return fallback;
  return Math.min(90, Math.max(10, n));
}

function normalizeLetterheadPages(value) {
  const s = String(value || 'all').toLowerCase();
  if (s === '1' || s === 'one' || s === 'first') return '1';
  if (s === '2' || s === 'two') return '2';
  return 'all';
}

const HF_ALIGNS = ['left', 'center', 'right'];
const HF_PAGES = ['all', 'first', 'notFirst'];

function normalizeHfPart(part, withPageNumber) {
  const p = part && typeof part === 'object' ? part : {};
  const offset = parseInt(p.offsetMm, 10);
  const out = {
    enabled: !!p.enabled,
    text: String(p.text || '').slice(0, 1000),
    align: HF_ALIGNS.includes(p.align) ? p.align : 'center',
    fontSize: normalizeDefaultFontSize(p.fontSize || '10pt'),
    bold: !!p.bold,
    offsetMm: Number.isNaN(offset) ? 8 : Math.min(60, Math.max(0, offset)),
  };
  if (withPageNumber) out.pageNumber = !!p.pageNumber;
  return out;
}

/** Custom running header/footer config. null when nothing was set up. */
function normalizeHeaderFooter(value) {
  let v = value;
  if (typeof v === 'string') {
    try {
      v = JSON.parse(v);
    } catch (_) {
      return null;
    }
  }
  if (!v || typeof v !== 'object') return null;
  const header = normalizeHfPart(v.header, false);
  const footer = normalizeHfPart(v.footer, true);
  if (!header.enabled && !footer.enabled && !header.text && !footer.text) return null;
  return { header, footer, pages: HF_PAGES.includes(v.pages) ? v.pages : 'all' };
}

function hfPartActive(part) {
  return !!(part && part.enabled && (String(part.text || '').trim() || part.pageNumber));
}

function hfActive(hf) {
  return !!hf && (hfPartActive(hf.header) || hfPartActive(hf.footer));
}

function hfShowsOnPage(hf, index) {
  if (!hfActive(hf)) return false;
  if (hf.pages === 'first') return index === 0;
  if (hf.pages === 'notFirst') return index > 0;
  return true;
}

/** Space (mm) the header/footer text needs from the page edge, so body text never overlaps it. */
function hfReserveMm(part) {
  if (!hfPartActive(part)) return 0;
  const pt = parseFloat(part.fontSize) || 10;
  const text = String(part.text || '').trim();
  const lines = (text ? text.split('\n').length : 0) + (part.pageNumber ? 1 : 0);
  return Math.ceil(part.offsetMm + Math.max(1, lines) * pt * 0.3528 * 1.25 + 3);
}

function hfPartHtml(hf, kind, vars, padX, pageNo, total) {
  const part = hf[kind];
  const escaped = String(part.text || '')
    .trim()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  let html = (vars ? fillTemplate(escaped, vars) : escaped).replace(/\r?\n/g, '<br>');
  if (part.pageNumber) {
    html +=
      `${html ? '<br>' : ''}Page <span class="hr-pg">${pageNo}</span> of <span class="hr-pgs">${total}</span>`;
  }
  const pos = kind === 'header' ? `top:${part.offsetMm}mm` : `bottom:${part.offsetMm}mm`;
  return (
    `<div class="page-hf page-hf--${kind}" style="${pos};padding:0 ${padX};` +
    `text-align:${part.align};font-size:${part.fontSize};font-weight:${part.bold ? 700 : 400};">` +
    `${html}</div>`
  );
}

function hfOverlayHtml(hf, index, total, vars, padX) {
  if (!hfShowsOnPage(hf, index)) return '';
  return ['header', 'footer']
    .filter((kind) => hfPartActive(hf[kind]))
    .map((kind) => hfPartHtml(hf, kind, vars, padX, index + 1, total))
    .join('');
}

/** Header/footer config for the in-browser paginator (printPaginator.js). */
function hfPaginateCfg(hf, vars, padX) {
  if (!hfActive(hf)) return null;
  const one = (kind) =>
    hfPartActive(hf[kind])
      ? { reserve: hfReserveMm(hf[kind]), html: hfPartHtml(hf, kind, vars, padX, 1, 1) }
      : null;
  return { pages: hf.pages, header: one('header'), footer: one('footer') };
}

const PAGE_SIZE_PRESETS = {
  A4: { wMm: 210, hMm: 297, label: 'A4' },
  Letter: { wMm: 216, hMm: 279, label: 'Letter' },
  Legal: { wMm: 216, hMm: 356, label: 'Legal' },
  A5: { wMm: 148, hMm: 210, label: 'A5' },
};

function normalizePageSize(value) {
  const s = String(value || 'A4').trim();
  const key = Object.keys(PAGE_SIZE_PRESETS).find((k) => k.toLowerCase() === s.toLowerCase());
  return key || 'A4';
}

function normalizeDefaultFontFamily(value) {
  const s = String(value || '').trim();
  if (!s) return 'Times New Roman';
  return s.slice(0, 64);
}

function normalizeDefaultFontSize(value) {
  const s = String(value || '').trim().toLowerCase();
  if (!s) return '12pt';
  if (/^\d+(\.\d+)?pt$/i.test(s)) return s.replace(/\s+/g, '');
  if (/^\d+(\.\d+)?px$/i.test(s)) {
    const px = parseFloat(s);
    return `${Math.round(px * 0.75)}pt`;
  }
  if (/^\d+(\.\d+)?$/.test(s)) return `${s}pt`;
  return '12pt';
}

function resolvePageDims(pageSize) {
  return PAGE_SIZE_PRESETS[normalizePageSize(pageSize)] || PAGE_SIZE_PRESETS.A4;
}

function letterheadPageLimit(letterheadPages) {
  const mode = normalizeLetterheadPages(letterheadPages);
  if (mode === '1') return 1;
  if (mode === '2') return 2;
  return Number.POSITIVE_INFINITY;
}

function resolveBodyPadTopMm({ letterheadBlank, letterheadDataUrl, hasImportedLayout, topPaddingMm }) {
  const custom = normalizeTopPaddingMm(topPaddingMm);
  if (custom != null) return custom;
  const useImage = !letterheadBlank && letterheadDataUrl;
  // Defaults: 0 top; letterhead image keeps a logo band
  if (useImage) return 24;
  return 0;
}

function isEmptyPrintSheet(html) {
  const raw = String(html || '');
  if (/<img\b/i.test(raw) || /<table\b/i.test(raw) || /<svg\b/i.test(raw)) return false;
  const plain = raw
    .replace(/<div\b[^>]*(?:page-break|data-page-break)[^>]*>[\s\S]*?<\/div>/gi, '')
    .replace(/<br\s*\/?>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;|&#160;|\u00a0/gi, '')
    .replace(/\s+/g, '')
    .trim();
  return plain.length === 0;
}

/** Plain-text length estimate for a block (letterhead body packing). */
function plainLen(html) {
  return String(html || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(?:p|div|h[1-6]|li|tr)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;|&#160;|\u00a0/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim().length;
}

/**
 * Split HTML into top-level blocks (best-effort, no DOM).
 * Used to pack ~one A4 body (~207mm ≈ 3200 chars of body text) per letterhead page.
 */
function splitTopLevelBlocks(html) {
  const src = String(html || '').trim();
  if (!src) return [];
  const blocks = [];
  const re =
    /<(p|div|h[1-6]|table|ul|ol|blockquote|pre|hr|section|article)\b[^>]*(?:\/>|>[\s\S]*?<\/\1>)/gi;
  let last = 0;
  let m;
  while ((m = re.exec(src))) {
    if (m.index > last) {
      const gap = src.slice(last, m.index).trim();
      if (gap) blocks.push(gap.startsWith('<') ? gap : `<p>${gap}</p>`);
    }
    blocks.push(m[0]);
    last = m.index + m[0].length;
  }
  if (last < src.length) {
    const gap = src.slice(last).trim();
    if (gap) blocks.push(gap.startsWith('<') ? gap : `<p>${gap}</p>`);
  }
  return blocks.length ? blocks : [src];
}

/** ~3200 plain chars ≈ letterhead body band (207mm at 12pt). */
const LH_BODY_CHARS = 3200;

function fitHtmlToLetterheadBody(html, maxChars = LH_BODY_CHARS) {
  const blocks = splitTopLevelBlocks(html);
  if (!blocks.length) return { fitted: '<p><br></p>', rest: '' };
  if (plainLen(blocks.join('')) <= maxChars) {
    return { fitted: blocks.join(''), rest: '' };
  }
  let used = 0;
  let best = 0;
  for (let n = 1; n <= blocks.length; n++) {
    const next = plainLen(blocks[n - 1]);
    if (best > 0 && used + next > maxChars) break;
    used += next;
    best = n;
    if (used >= maxChars) break;
  }
  if (best === 0) best = 1;
  return {
    fitted: blocks.slice(0, best).join(''),
    rest: blocks.slice(best).join(''),
  };
}

/**
 * Server-side estimate of the printed pages (fallback when the in-browser paginator
 * can't run). Every page is a fixed sheet; each keeps the index of its manual
 * page-break sheet so the browser paginator can re-flow it accurately.
 * layout = { hf, pageHMm, lhHead, lhFoot, lhTopPad, plainTop, plainBottom } (mm).
 */
function paginateSheetsForLetterhead(sheets, lhMax, useImage, layout = {}) {
  const { hf, pageHMm, lhHead, lhFoot, lhTopPad = 0, plainTop, plainBottom } = layout;
  // ~LH_BODY_CHARS fit the default A4 letterhead body band (297 − 28 − 40 mm)
  const charsFor = (top, bottom) =>
    Math.max(400, Math.round((LH_BODY_CHARS * (pageHMm - top - bottom)) / (297 - 28 - 40)));
  const out = [];
  const queue = sheets
    .map((html, sheet) => ({ html, sheet }))
    .filter((q) => q.html && !isEmptyPrintSheet(q.html));
  let lhUsed = 0;
  while (queue.length) {
    const { html: chunk, sheet } = queue.shift();
    const wantLh = useImage && lhUsed < lhMax;
    const showHf = hfShowsOnPage(hf, out.length);
    const headRes = showHf ? hfReserveMm(hf.header) : 0;
    const footRes = showHf ? hfReserveMm(hf.footer) : 0;
    // Top space applies below the letterhead logo band too (same as the editor)
    const padTop = Math.max(wantLh ? lhHead + lhTopPad : plainTop, headRes);
    const padBottom = Math.max(wantLh ? lhFoot : plainBottom, footRes);
    const { fitted, rest } = fitHtmlToLetterheadBody(chunk, charsFor(padTop, padBottom));
    if (!isEmptyPrintSheet(fitted)) {
      out.push({ chunk: fitted, withLh: wantLh, sheet, padTop, padBottom });
      if (wantLh) lhUsed++;
    }
    if (rest && !isEmptyPrintSheet(rest)) queue.unshift({ html: rest, sheet });
  }
  return out.length
    ? out
    : [{ chunk: '<p><br></p>', withLh: false, sheet: 0, padTop: plainTop, padBottom: plainBottom }];
}

function splitBodyByPageBreaks(html) {
  let src = String(html || '');
  src = src.replace(
    /(?:<div\b[^>]*(?:class\s*=\s*["'][^"']*\bpage-break\b[^"']*["']|data-page-break\s*=)[^>]*>\s*<\/div>\s*){2,}/gi,
    '<div class="page-break" data-page-break="1"></div>'
  );
  const parts = src.split(
    /<div\b[^>]*(?:class\s*=\s*["'][^"']*page-break[^"']*["']|data-page-break\s*=)[^>]*>\s*<\/div>/gi
  );
  const cleaned = parts
    .map((p) => p.trim())
    .filter((p) => p.length > 0 && !isEmptyPrintSheet(p));
  return cleaned.length ? cleaned : ['<p><br></p>'];
}

function wrapPreviewHtml({
  filled,
  letterheadBlank,
  letterheadDataUrl,
  topPaddingMm,
  letterheadPages,
  letterheadHeaderMm,
  letterheadFooterMm,
  pageSize,
  defaultFontFamily,
  defaultFontSize,
  headerFooter,
  vars,
}) {
  const useImage = !letterheadBlank && letterheadDataUrl;
  const hf = normalizeHeaderFooter(headerFooter);
  const body = wrapTrailingFooter(normalizeQuillHtmlForPrint(String(filled || '')));
  const hasImportedLayout =
    /hr-imported-doc|data-preserve-layout|hr-doc-table|hr-numbered/i.test(body);
  const padTopMm = resolveBodyPadTopMm({
    letterheadBlank,
    letterheadDataUrl,
    hasImportedLayout,
    topPaddingMm,
  });
  const dims = resolvePageDims(pageSize);
  const pageW = `${dims.wMm}mm`;
  const pageH = `${dims.hMm}mm`;
  const fontFamily = normalizeDefaultFontFamily(defaultFontFamily).replace(/'/g, "\\'");
  const fontSize = normalizeDefaultFontSize(defaultFontSize);
  const bodyPadX = hasImportedLayout ? '14mm' : '18mm';
  const bodyPadBottom = hasImportedLayout ? '14mm' : letterheadBlank ? '18mm' : '22mm';
  const bgUrl = useImage ? String(letterheadDataUrl).replace(/'/g, '%27') : '';
  const lhMax = useImage ? letterheadPageLimit(letterheadPages) : 0;
  const LH_HEAD_MM = normalizeLhBandMm(letterheadHeaderMm, 28);
  const LH_FOOT_MM = normalizeLhBandMm(letterheadFooterMm, 40);
  const sheets = splitBodyByPageBreaks(body);
  const lhTopPad = normalizeTopPaddingMm(topPaddingMm) ?? 0;
  const pageSpecs = paginateSheetsForLetterhead(sheets, lhMax, useImage && !!bgUrl, {
    hf,
    pageHMm: dims.hMm,
    lhHead: LH_HEAD_MM,
    lhFoot: LH_FOOT_MM,
    lhTopPad,
    plainTop: padTopMm,
    plainBottom: parseFloat(bodyPadBottom),
  });
  const totalPages = pageSpecs.length;
  const pagesHtml = pageSpecs
    .map(({ chunk, withLh, sheet, padTop, padBottom }, i) => {
      const layers = withLh
        ? '<div class="page-lh-header"></div><div class="page-lh-footer"></div><div class="page-lh-mask"></div>'
        : '';
      return (
        `<div class="page ${withLh ? 'page--lh' : 'page--plain'}" data-sheet="${sheet}">` +
        layers +
        hfOverlayHtml(hf, i, totalPages, vars, bodyPadX) +
        `<div class="page-body" style="padding:${padTop}mm ${bodyPadX} ${padBottom}mm;">${chunk}</div>` +
        `</div>`
      );
    })
    .join('\n');
  // Browser re-flows the estimate above by measuring the real layout
  const paginateCfg = {
    useImage: !!(useImage && bgUrl),
    lhMax: Number.isFinite(lhMax) ? lhMax : 9999,
    lhHead: LH_HEAD_MM,
    lhFoot: LH_FOOT_MM,
    lhTopPad,
    plainTop: padTopMm,
    plainBottom: parseFloat(bodyPadBottom),
    padX: bodyPadX,
    hf: hfPaginateCfg(hf, vars, bodyPadX),
  };

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
      @page { size: ${dims.label}; margin: 0; }
      html, body { margin: 0; padding: 0; background: #fff; }
      body {
        font-family: '${fontFamily}', Arial, sans-serif;
        font-size: ${fontSize};
        line-height: 1.15;
        color: #000;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      /* Every page is a fixed sheet of the selected paper size (auto-paginated) */
      .page {
        position: relative;
        width: ${pageW};
        height: ${pageH};
        box-sizing: border-box;
        margin: 0 auto;
        padding: 0;
        overflow: hidden;
        background-color: #fff;
        page-break-after: always;
        break-after: page;
      }
      .page:last-child { page-break-after: auto; break-after: auto; }
      .page-lh-header, .page-lh-footer {
        position: absolute; left: 0; right: 0; z-index: 0; pointer-events: none;
        background-image: url('${bgUrl}');
        background-repeat: no-repeat; background-size: ${pageW} ${pageH};
      }
      .page-lh-header {
        top: 0; height: ${LH_HEAD_MM}mm; background-position: top center;
      }
      .page-lh-footer {
        bottom: 0; height: ${LH_FOOT_MM}mm; background-position: bottom center;
      }
      .page-lh-mask {
        position: absolute; left: 0; right: 0; z-index: 0; pointer-events: none;
        top: ${LH_HEAD_MM}mm; bottom: ${LH_FOOT_MM}mm; background: #fff;
      }
      .page > .page-body {
        position: relative; z-index: 1; box-sizing: border-box;
        height: 100%; overflow: hidden !important;
        background: transparent; margin: 0;
      }
      .page-hf {
        position: absolute; left: 0; right: 0; z-index: 2; box-sizing: border-box;
        line-height: 1.25; color: #000; white-space: normal; pointer-events: none;
      }
      /* On screen show separate sheets so page breaks are visible in the preview */
      @media screen {
        html, body { background: #d1d5db; }
        body { padding: 16px 0; }
        .page { margin: 0 auto 16px; box-shadow: 0 4px 18px rgba(0, 0, 0, 0.2); }
      }
      .page-body { display: block; }
      .page, .page-body { white-space: pre-wrap; }
      p, h1, h2, h3, h4, h5, h6, ol, ul, blockquote {
        margin: 0;
        margin-bottom: 5pt;
        padding: 0;
        margin-left: 0 !important;
        text-indent: 0 !important;
        padding-left: 0 !important;
      }
      li { margin-bottom: 0; }
      p:empty, p:has(> br:only-child) { min-height: 1.375em; }
      .ql-spacer, div[data-vspace] { display: block; margin: 0; padding: 0; border: 0; }
      [class*="ql-indent"] { padding-left: 0 !important; margin-left: 0 !important; }
      blockquote { border: 0; }
      h1, h2, h3 { font-weight: bold; }
      img { max-width: 100%; height: auto; display: inline-block; page-break-inside: avoid; break-inside: avoid; }
      table, .hr-doc-table {
        width: 100% !important;
        table-layout: auto;
        border-collapse: collapse;
        margin: 0;
        border: none;
      }
      td, th {
        border: none;
        padding: 2px 6px;
        vertical-align: top;
        width: auto;
      }
      table.hr-sig-table td { width: 50%; }
      table.hr-doc-table-bordered td,
      table.hr-doc-table-bordered th,
      table[border]:not([border="0"]) td,
      table[border]:not([border="0"]) th {
        border: 1px solid #000;
        padding: 4px 6px;
      }
      ul, ol, .hr-doc-ul, .hr-doc-ol { padding-left: 1.4em; margin: 0.4em 0; display: block; }
      ol, .hr-doc-ol { list-style-type: decimal !important; list-style-position: outside; }
      ul, .hr-doc-ul { list-style-type: disc !important; list-style-position: outside; }
      li { display: list-item !important; margin: 0; }
      .hr-numbered { margin: 0.35em 0; }
      .ql-align-left, .hr-align-left { text-align: left !important; }
      .ql-align-center, .hr-align-center { text-align: center !important; }
      .ql-align-right, .hr-align-right { text-align: right !important; }
      .ql-align-justify, .hr-align-justify { text-align: justify !important; }
      .ql-size-small { font-size: 0.75em; }
      .ql-size-large { font-size: 1.5em; }
      .ql-size-huge { font-size: 2.5em; }
      strong, b { font-weight: 700 !important; }
      em, i { font-style: italic !important; }
      u { text-decoration: underline !important; }
      s, strike, del { text-decoration: line-through !important; }
      .ql-color-white { color: #fff !important; }
      .ql-color-red { color: #e60000 !important; }
      .ql-color-orange { color: #f90 !important; }
      .ql-color-yellow { color: #ff0 !important; }
      .ql-color-green { color: #008a00 !important; }
      .ql-color-blue { color: #06c !important; }
      .ql-color-purple { color: #93f !important; }
      .ql-bg-black { background-color: #000 !important; }
      .ql-bg-red { background-color: #e60000 !important; }
      .ql-bg-orange { background-color: #f90 !important; }
      .ql-bg-yellow { background-color: #ff0 !important; }
      .ql-bg-green { background-color: #008a00 !important; }
      .ql-bg-blue { background-color: #06c !important; }
      .ql-bg-purple { background-color: #93f !important; }
      [style*="color:"], [style*="background-color"], [style*="background:"], font[color] {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .hr-print-footer { page-break-inside: avoid !important; break-inside: avoid !important; margin-top: 12pt; }
      .hr-print-footer img { page-break-inside: avoid !important; break-inside: avoid !important; }
      .page-break, [data-page-break] {
        display: none !important; height: 0 !important; margin: 0 !important; padding: 0 !important; border: 0 !important;
      }
      .hr-imported-doc {
        font-family: '${fontFamily}', Arial, sans-serif;
        font-size: ${fontSize};
        color: #000;
      }
      .hr-align-left, .ql-align-left { text-align: left !important; }
      .hr-align-center, .ql-align-center { text-align: center !important; }
      .hr-align-right, .ql-align-right { text-align: right !important; }
      .hr-align-justify, .ql-align-justify { text-align: justify !important; }
      u, span[style*="underline"] { text-decoration: underline !important; }
      [style*="text-align: right"], [style*="text-align:right"] { text-align: right !important; }
      [style*="text-align: left"], [style*="text-align:left"] { text-align: left !important; }
      [style*="text-align: center"], [style*="text-align:center"] { text-align: center !important; }
      [style*="text-align: justify"], [style*="text-align:justify"] { text-align: justify !important; }
      @media print {
        .page {
          box-shadow: none;
          margin: 0 !important;
          height: ${pageH} !important; min-height: 0 !important; max-height: ${pageH} !important;
          overflow: hidden !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .page-lh-header, .page-lh-footer, .page-lh-mask {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
      }
    </style></head><body><div class="sheet-wrap" data-hr-root>${pagesHtml}</div>${paginatorScriptTag(paginateCfg)}</body></html>`;
}

function buildAnnexure(vars) {
  return `
    <div style="page-break-before:always"></div>
    <h3 style="text-align:center;text-decoration:underline">Annexure A – Compensation Structure</h3>
    <p>Employee: <b>${vars.employee_name}</b> (${vars.employee_id})</p>
    <p>Designation: ${vars.designation}</p>
    <p>Annual CTC: ${vars.annual_ctc}</p>
    <p>Monthly CTC: ${vars.monthly_ctc}</p>
    ${vars.salary_table !== BLANK ? vars.salary_table : '<p>Salary breakup not available.</p>'}
  `;
}

exports.previewDocument = async (req, res) => {
  try {
    const tenantId = req.users?.tenantId;
    const { templateId, employeeId, hrName, issueDate } = req.body;
    if (!tenantId || !templateId || !employeeId) {
      return Helper.response(false, 'templateId and employeeId are required', {}, res, 400);
    }

    const template = await DocumentTemplate.findOne({ where: { id: templateId, tenantId } });
    if (!template) return Helper.response(false, 'Template not found', {}, res, 404);

    const vars = await buildVariableMap(tenantId, employeeId, hrName, issueDate);
    if (!vars) return Helper.response(false, 'Employee not found', {}, res, 404);

    let filled = fillTemplate(template.bodyHtml, vars);
    if (template.includeSalaryAnnexure) {
      filled += buildAnnexure(vars);
    }

    const letterheadDataUrl = template.letterheadBlank
      ? null
      : await getLetterheadBase64(tenantId);

    const html = wrapPreviewHtml({
      filled,
      letterheadBlank: !!template.letterheadBlank,
      letterheadDataUrl,
      topPaddingMm: template.topPaddingMm,
      letterheadPages: template.letterheadPages,
      letterheadHeaderMm: template.letterheadHeaderMm,
      letterheadFooterMm: template.letterheadFooterMm,
      pageSize: template.pageSize,
      defaultFontFamily: template.defaultFontFamily,
      defaultFontSize: template.defaultFontSize,
      headerFooter: template.headerFooter,
      vars,
    });

    return Helper.response(
      true,
      'Preview generated',
      {
        html,
        variables: vars,
        templateName: template.name,
        meta: {
          templateId,
          employeeId,
          templateName: template.name,
          letterheadBlank: template.letterheadBlank,
          topPaddingMm: template.topPaddingMm,
          letterheadPages: template.letterheadPages || 'all',
          letterheadHeaderMm: template.letterheadHeaderMm ?? 28,
          letterheadFooterMm: template.letterheadFooterMm ?? 40,
          pageSize: template.pageSize || 'A4',
          defaultFontFamily: template.defaultFontFamily || 'Times New Roman',
          defaultFontSize: template.defaultFontSize || '12pt',
          headerFooter: template.headerFooter || null,
          includeSalaryAnnexure: template.includeSalaryAnnexure,
          hasLetterheadImage: !!letterheadDataUrl,
        },
      },
      res,
      200
    );
  } catch (error) {
    console.error('previewDocument', error);
    return Helper.response(false, error.message, {}, res, 500);
  }
};

exports.saveGeneratedDocument = async (req, res) => {
  try {
    const tenantId = req.users?.tenantId;
    const branchId = req.body?.branchId || req.users?.branchId || null;
    const { templateId, employeeId, filledHtml, variables, hrName } = req.body;
    if (!tenantId || !templateId || !employeeId) {
      return Helper.response(false, 'templateId and employeeId are required', {}, res, 400);
    }

    const template = await DocumentTemplate.findOne({ where: { id: templateId, tenantId } });
    if (!template) return Helper.response(false, 'Template not found', {}, res, 404);

    let html = filledHtml;
    let snapshot = variables || null;
    if (!html) {
      const vars = await buildVariableMap(tenantId, employeeId, hrName);
      if (!vars) return Helper.response(false, 'Employee not found', {}, res, 404);
      snapshot = vars;
      let filled = fillTemplate(template.bodyHtml, vars);
      if (template.includeSalaryAnnexure) filled += buildAnnexure(vars);
      const letterheadDataUrl = template.letterheadBlank
        ? null
        : await getLetterheadBase64(tenantId);
      html = wrapPreviewHtml({
        filled,
        letterheadBlank: !!template.letterheadBlank,
        letterheadDataUrl,
        topPaddingMm: template.topPaddingMm,
        letterheadPages: template.letterheadPages,
        letterheadHeaderMm: template.letterheadHeaderMm,
        letterheadFooterMm: template.letterheadFooterMm,
        pageSize: template.pageSize,
        defaultFontFamily: template.defaultFontFamily,
        defaultFontSize: template.defaultFontSize,
        headerFooter: template.headerFooter,
        vars,
      });
    } else if (!/^\s*<!DOCTYPE html/i.test(html) && !/<html[\s>]/i.test(html)) {
      // Body-only HTML from client — wrap so print/assign matches template layout
      const letterheadDataUrl = template.letterheadBlank
        ? null
        : await getLetterheadBase64(tenantId);
      html = wrapPreviewHtml({
        filled: html,
        letterheadBlank: !!template.letterheadBlank,
        letterheadDataUrl,
        topPaddingMm: template.topPaddingMm,
        letterheadPages: template.letterheadPages,
        letterheadHeaderMm: template.letterheadHeaderMm,
        letterheadFooterMm: template.letterheadFooterMm,
        pageSize: template.pageSize,
        defaultFontFamily: template.defaultFontFamily,
        defaultFontSize: template.defaultFontSize,
        headerFooter: template.headerFooter,
        vars: snapshot || {},
      });
    }

    const row = await GeneratedDocument.create({
      tenantId,
      branchId,
      employeeId,
      templateId,
      templateName: template.name,
      filledHtml: html,
      dataSnapshot: snapshot,
      createdBy: req.users?.id,
    });

    return Helper.response(true, 'Document saved', row, res, 201);
  } catch (error) {
    console.error('saveGeneratedDocument', error);
    return Helper.response(false, error.message, {}, res, 500);
  }
};

exports.listGeneratedDocuments = async (req, res) => {
  try {
    const tenantId = req.users?.tenantId;
    const { employeeId } = req.body;
    if (!tenantId) return Helper.response(false, 'Unauthorized', {}, res, 401);

    const where = { tenantId };
    if (employeeId) where.employeeId = employeeId;

    const rows = await GeneratedDocument.findAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: 100,
      attributes: { exclude: ['filledHtml'] },
    });
    return Helper.response(true, 'Generated documents', rows, res, 200);
  } catch (error) {
    return Helper.response(false, error.message, {}, res, 500);
  }
};

exports.getGeneratedDocument = async (req, res) => {
  try {
    const tenantId = req.users?.tenantId;
    const { id } = req.body;
    if (!tenantId || !id) return Helper.response(false, 'id is required', {}, res, 400);

    const row = await GeneratedDocument.findOne({ where: { id, tenantId } });
    if (!row) return Helper.response(false, 'Document not found', {}, res, 404);
    return Helper.response(true, 'Document fetched', row, res, 200);
  } catch (error) {
    return Helper.response(false, error.message, {}, res, 500);
  }
};
