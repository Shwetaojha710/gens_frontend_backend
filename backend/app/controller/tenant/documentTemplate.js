const DocumentTemplate = require('../../models/documentTemplate');
const GeneratedDocument = require('../../models/generatedDocument');
const empPersonal = require('../../models/empPersonal');
const Tenant = require('../../models/tenant');
const Designation = require('../../models/designation');
const Department = require('../../models/department');
const Helper = require('../../helper/helper');
const { Op } = require('sequelize');
const fs = require('fs');
const path = require('path');

const BLANK = '____________';

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
      includeSalaryAnnexure,
      status,
    } = req.body;

    if (!tenantId) return Helper.response(false, 'Unauthorized', {}, res, 401);
    if (!name || !bodyHtml) {
      return Helper.response(false, 'Name and body are required', {}, res, 400);
    }

    const row = await DocumentTemplate.create({
      tenantId,
      branchId,
      name: String(name).trim(),
      category: category || 'custom',
      bodyHtml,
      letterheadBlank: letterheadBlank === true,
      includeSalaryAnnexure: !!includeSalaryAnnexure,
      status: status === 'inactive' ? 'inactive' : 'active',
      createdBy: req.users?.id,
      updatedBy: req.users?.id,
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
    const { id, name, category, bodyHtml, letterheadBlank, includeSalaryAnnexure, status } =
      req.body;
    if (!tenantId || !id) return Helper.response(false, 'id is required', {}, res, 400);

    const row = await DocumentTemplate.findOne({ where: { id, tenantId } });
    if (!row) return Helper.response(false, 'Template not found', {}, res, 404);

    if (name != null) row.name = String(name).trim();
    if (category != null) row.category = category;
    if (bodyHtml != null) row.bodyHtml = bodyHtml;
    if (letterheadBlank != null) row.letterheadBlank = !!letterheadBlank;
    if (includeSalaryAnnexure != null) row.includeSalaryAnnexure = !!includeSalaryAnnexure;
    if (status != null) row.status = status === 'inactive' ? 'inactive' : 'active';
    row.updatedBy = req.users?.id;
    await row.save();

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

    const rows = await DocumentTemplate.findAll({
      where,
      order: [['updatedAt', 'DESC']],
    });
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

    const deleted = await DocumentTemplate.destroy({ where: { id, tenantId } });
    if (!deleted) return Helper.response(false, 'Template not found', {}, res, 404);
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

function wrapPreviewHtml({ filled, letterheadBlank, letterheadDataUrl }) {
  const useImage = !letterheadBlank && letterheadDataUrl;
  const body = String(filled || '');
  const hasImportedLayout =
    /hr-imported-doc|data-preserve-layout|hr-align-|text-align\s*:|hr-numbered|hr-doc-table/i.test(body);
  // Pre-printed paper spacer only when template is blank-top AND not a full imported Word layout
  const spacer =
    letterheadBlank && !hasImportedLayout
      ? `<div style="height:120mm;min-height:120mm">&nbsp;</div>`
      : '';
  // Match Manage Template editor padding so assign/preview looks identical
  const bodyPadTop = hasImportedLayout ? '12mm' : useImage ? '36mm' : letterheadBlank ? '0' : '18mm';
  const bodyPadX = hasImportedLayout ? '14mm' : '18mm';
  const bodyPadBottom = hasImportedLayout ? '14mm' : '22mm';
  const bgCss = useImage
    ? `background-image:url('${letterheadDataUrl}');background-repeat:no-repeat;background-position:top center;background-size:100% auto;`
    : '';

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
      @page { size: A4; margin: 0; }
      html, body { margin: 0; padding: 0; }
      body {
        font-family: 'Times New Roman', Times, serif;
        font-size: 12pt;
        line-height: 1.5;
        color: #000;
        ${bgCss}
      }
      .page {
        width: 210mm;
        min-height: 297mm;
        box-sizing: border-box;
        padding: ${bodyPadTop} ${bodyPadX} ${bodyPadBottom};
        margin: 0 auto;
        background: #fff;
      }
      /* Keep template spacing — do not flatten */
      p, h1, h2, h3, h4, h5, h6 { margin: 0.35em 0; }
      p[style*="margin"], h1[style], h2[style], h3[style] { margin-top: unset; margin-bottom: unset; }
      /* Do NOT force center on headings — template alignment wins */
      h1, h2, h3 { font-weight: bold; }
      img { max-width: 100%; height: auto; }
      /* Layout tables (signature L/R) stay borderless by default — matches Word */
      table, .hr-doc-table {
        width: 100%;
        border-collapse: collapse;
        margin: 0.5em 0;
        border: none;
      }
      td, th {
        border: none;
        padding: 2px 6px;
        vertical-align: top;
      }
      /* Only show grid when template/table explicitly bordered */
      table.hr-doc-table-bordered td,
      table.hr-doc-table-bordered th,
      table[border]:not([border="0"]) td,
      table[border]:not([border="0"]) th {
        border: 1px solid #000;
        padding: 4px 6px;
      }
      ul, ol, .hr-doc-ul, .hr-doc-ol { padding-left: 1.6em; margin: 0.4em 0; }
      ol, .hr-doc-ol { list-style-type: decimal !important; list-style-position: outside; }
      ul, .hr-doc-ul { list-style-type: disc !important; list-style-position: outside; }
      li { display: list-item !important; margin: 0.2em 0; }
      .hr-numbered { margin: 0.35em 0; }
      .page-break {
        display: block;
        page-break-before: always;
        break-before: page;
        height: 0;
        margin: 12mm 0;
        border: 0;
        border-top: 1px dashed #cbd5e1;
      }
      .hr-imported-doc {
        font-family: 'Times New Roman', Times, serif;
        font-size: 12pt;
        line-height: 1.5;
        color: #000;
      }
      .hr-align-left, .ql-align-left { text-align: left !important; }
      .hr-align-center, .ql-align-center { text-align: center !important; }
      .hr-align-right, .ql-align-right { text-align: right !important; }
      .hr-align-justify, .ql-align-justify { text-align: justify !important; }
      u, span[style*="underline"] { text-decoration: underline !important; }
      /* Preserve inline text-align from editor / Word */
      [style*="text-align: right"], [style*="text-align:right"] { text-align: right !important; }
      [style*="text-align: left"], [style*="text-align:left"] { text-align: left !important; }
      [style*="text-align: center"], [style*="text-align:center"] { text-align: center !important; }
      [style*="text-align: justify"], [style*="text-align:justify"] { text-align: justify !important; }
      @media print {
        .page { box-shadow: none; }
        .page-break { page-break-before: always; break-before: page; border: 0; }
      }
    </style></head><body><div class="page">${spacer}${filled}</div></body></html>`;
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
