const LetterData = require('../../models/letter_data');
const Helper = require('../../helper/helper');
const empPersonal = require('../../models/empPersonal');
const Designation = require('../../models/designation');
const Department = require('../../models/department');
const Tenant = require('../../models/tenant');
const PdfPrinter = require('pdfmake');
const path = require('path');
const fs = require('fs');

const letterPdfFonts = {
  Roboto: { normal: 'Helvetica', bold: 'Helvetica-Bold', italics: 'Helvetica-Oblique', bolditalics: 'Helvetica-BoldOblique' }
};
const letterPrinter = new PdfPrinter(letterPdfFonts);

const fmtDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const day = d.getDate();
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const year = d.getFullYear();
  const v = day % 100;
  const suf = (v >= 11 && v <= 13) ? 'th' : (['th','st','nd','rd','th','th','th','th','th','th'][day % 10]);
  return `${day}${suf} ${months[d.getMonth()]}, ${year}`;
};

// Returns pdfmake inline text array with raised superscript ordinal (e.g. 22ⁿᵈ April, 2026)
const fmtDatePdf = (dateStr) => {
    if (!dateStr) return [{ text: '___' }];
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return [{ text: String(dateStr) }];
    const day = d.getDate();
    const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const v = day % 100;
    const suf = (v >= 11 && v <= 13) ? 'th' : (['th','st','nd','rd','th','th','th','th','th','th'][day % 10]);
    return [
        { text: String(day) },
        { text: suf, fontSize: 7, baseline: 4 },
        { text: ` ${months[d.getMonth()]}, ${d.getFullYear()}` }
    ];
};

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

const getLetterheadBase64 = (type, tenantLetterheadFile = null) => {
    if (type === 'appointment') return null;

    // Use tenant's uploaded letterhead if available
    if (tenantLetterheadFile) {
        const uploadedPath = path.join(__dirname, '../../../upload', tenantLetterheadFile);
        try { return `data:image/png;base64,${fs.readFileSync(uploadedPath).toString('base64')}`; } catch (_) {}
    }

    // Fallback to static asset
    const tryPaths = [
        path.join(__dirname, '../../../../frontend/assets/img', 'Letterhead-2.png'),
        path.join(__dirname, '../../../../frontend/dist/forntend/browser/assets/img', 'Letterhead-2.png')
    ];
    for (const p of tryPaths) {
        try { return `data:image/png;base64,${fs.readFileSync(p).toString('base64')}`; } catch (_) {}
    }
    return null;
};

const numToWordsBackend = (n) => {
    if (!n) return 'Zero';
    const a = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
    const b = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
    const n2w = (num) => {
        if (num < 20) return a[num];
        if (num < 100) return b[Math.floor(num/10)] + (num % 10 ? ' ' + a[num % 10] : '');
        if (num < 1000) return a[Math.floor(num/100)] + ' Hundred' + (num % 100 ? ' ' + n2w(num % 100) : '');
        return '';
    };
    let result = '', rem = Math.round(n);
    const crore = Math.floor(rem / 10000000); rem %= 10000000;
    const lakh  = Math.floor(rem / 100000);   rem %= 100000;
    const thou  = Math.floor(rem / 1000);     rem %= 1000;
    if (crore) result += n2w(crore) + ' Crore ';
    if (lakh)  result += n2w(lakh)  + ' Lakh ';
    if (thou)  result += n2w(thou)  + ' Thousand ';
    if (rem)   result += n2w(rem);
    return result.trim() + ' Only';
};

// HTML padding: 100px top, 60px sides, 60px bottom at 96dpi → 0.75pt/px → [45, 75, 45, 45]
const buildLetterDoc = (type, emp, data, designation, department, tenant, letterheadBase64 = null) => {
    const empName = `${emp.firstName} ${emp.lastName}`;
    const salutationPrefix = emp.gender === 'Female' ? 'D/O' : 'S/O';
    const designationName = data.designation || (designation && designation.name) || '';
    const companyName = (tenant && tenant.companyName) || 'Company';
    const companyAddress = (tenant && tenant.companyAddress) || '';
    const margins = [45, 75, 45, 45];
    const bg = letterheadBase64 ? {
        background: function(currentPage, pageSize) {
            return { image: letterheadBase64, width: pageSize.width, height: pageSize.height, absolutePosition: { x: 0, y: 0 } };
        }
    } : {};
    const fmt = (n) => Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });

    if (type === 'offer') {
        const offerDateNodes = fmtDatePdf(data.offerDate || data.date);
        const joiningDateNodes = fmtDatePdf(emp.joiningDate || data.joiningDate);
        const refNo = `Quaere/Emp/Offer/${data.refNo || ''}`;
        return {
            fileName: `offer_letter_${emp.empCode || empName.replace(/ /g, '_')}_${Date.now()}.pdf`,
            doc: Object.assign({ pageSize: 'A4', pageMargins: margins }, bg, {
                content: [
                    { columns: [
                        { text: `Ref: ${refNo}`, bold: true, fontSize: 11 },
                        { text: ['Dated: ', ...offerDateNodes], bold: true, fontSize: 11, alignment: 'right' }
                    ], margin: [0, 20, 0, 20] },
                    { stack: [
                        { text: empName, bold: true, fontSize: 11 },
                        { text: `${salutationPrefix} ${emp.fatherName || ''}`, fontSize: 11 },
                        { text: emp.permanentAddress || '', fontSize: 11 }
                    ], margin: [0, 0, 0, 20] },
                    { text: `Dear ${emp.firstName},`, bold: true, margin: [0, 0, 0, 10] },
                    { text: `With reference to your application and subsequent interview with us, we are pleased to offer you employment in our Company as ${designationName} in the ${data.department || ''} at our Head Office – ${companyAddress}, as per the mutually agreed terms and conditions discussed with you at the time of interview.`, fontSize: 11, margin: [0, 0, 0, 8] },
                    { text: ['You are requested to report for joining on or before ', ...joiningDateNodes, '.'], fontSize: 11, margin: [0, 0, 0, 8] },
                    { text: 'You are advised to submit the following documents at the time of joining:', fontSize: 11, margin: [0, 0, 0, 5] },
                    { ol: [
                        'Three Latest passport size color photographs.',
                        'Self-attested copy of address proof & ID proof.',
                        'One set of all credentials (mark sheet of 10th & 12th and pass certificate with Degree/Diploma).',
                        'Salary proof from previous Company.',
                        'Relieving Letter/ No dues/ Clearance Certificate from all previous employers.',
                        'Two references of immediate reporting person (one of current employer & one of previous employer).'
                    ], fontSize: 11, margin: [0, 0, 0, 10] },
                    { text: 'This offer would automatically stand revoked in the event of not reporting at the date specified above and / or you not complying with any other terms & conditions of employment or in case of a negative reference check received. At the time of joining, the formal appointment letter, containing detailed terms & conditions, will be issued to you.', fontSize: 11, margin: [0, 0, 0, 8] },
                    { text: 'We take this opportunity to welcome you to our Company and look forward to a long and mutually beneficial association with you.', fontSize: 11, margin: [0, 0, 0, 8] },
                    { text: 'Please confirm your acceptance of this offer by signing and returning a copy of this letter to us.', fontSize: 11, margin: [0, 0, 0, 30] },
                    { columns: [
                        { width: '50%', stack: [
                            { text: 'Thanks & Regards', fontSize: 11 },
                            { text: '\n\n' },
                            { text: 'Human Resource Dept', bold: true, fontSize: 11 }
                        ]},
                        { width: '50%', stack: [
                            { text: 'Agreed & Accepted', fontSize: 11, alignment: 'right' },
                            { text: '\n\n' },
                            { text: empName, bold: true, fontSize: 11, alignment: 'right' }
                        ]}
                    ]}
                ],
                defaultStyle: { font: 'Roboto' }
            })
        };
    }

    if (type == 'appointment') {
        const rawJoining = data.joiningDate || emp.joiningDate || '';
        const joiningFmt = rawJoining
            ? (function() { var d = new Date(rawJoining); return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); })()
            : '';
        const refNo = data.ref_no || '';
        const ctc = data.ctc || 0;
        const ctcFmt = fmt(ctc);
        const salaryTable = data.salaryTable || null;
        const signature = data.signature || null;

        var annexureContent = [];
        if (salaryTable) {
            var earnings  = Array.isArray(salaryTable.earnings)   ? salaryTable.earnings   : [];
            var deductions = Array.isArray(salaryTable.deductions) ? salaryTable.deductions : [];
            var tblBody = [
                [{ text: 'Particulars', bold: true, fontSize: 11 }, { text: 'Annual', bold: true, fontSize: 11 }, { text: 'Monthly', bold: true, fontSize: 11 }],
                [{ text: 'Gross Remuneration', bold: true, fontSize: 11 }, { text: fmt(salaryTable.totalEarning), fontSize: 11 }, { text: fmt((salaryTable.totalEarning || 0) / 12), fontSize: 11 }]
            ];
            earnings.forEach(function(item) {
                tblBody.push([
                    { text: item.name || item.component_name || '', fontSize: 11 },
                    { text: fmt(item.finalAmount), fontSize: 11 },
                    { text: fmt((item.finalAmount || 0) / 12), fontSize: 11 }
                ]);
            });
            tblBody.push([{ text: 'Parts of Benefits', bold: true, fontSize: 11 }, { text: '' }, { text: '' }]);
            deductions.forEach(function(item) {
                tblBody.push([
                    { text: item.component_name || item.name || '', fontSize: 11 },
                    { text: fmt(item.finalAmount), fontSize: 11 },
                    { text: fmt((item.finalAmount || 0) / 12), fontSize: 11 }
                ]);
            });
            tblBody.push([{ text: 'In Hand Remuneration', bold: true, fontSize: 11 }, { text: fmt(salaryTable.netSalary), fontSize: 11 }, { text: fmt((salaryTable.netSalary || 0) / 12), fontSize: 11 }]);
            tblBody.push([{ text: 'Total Cost to the Company (Annual)', bold: true, fontSize: 11 }, { text: ctcFmt, fontSize: 11 }, { text: fmt(ctc / 12), fontSize: 11 }]);
            tblBody.push([{ text: `Annual Cost to Company (In Words) — ${numToWordsBackend(ctc)}`, bold: true, fontSize: 11, colSpan: 3 }, {}, {}]);

            annexureContent = [
                { text: 'Annexure "A"', bold: true, decoration: 'underline', alignment: 'center', fontSize: 12, margin: [0, 0, 0, 8], pageBreak: 'before' },
                { text: 'Cost to Company Details', bold: true, fontSize: 11, margin: [0, 0, 0, 5] },
                { text: `In continuation to our appointment letter dated ${joiningFmt}, the breakup of your salary will be as follows:`, fontSize: 11, margin: [0, 0, 0, 8] },
                { text: 'Salary Annexure', bold: true, decoration: 'underline', alignment: 'center', fontSize: 11, margin: [0, 0, 0, 8] },
                { table: { widths: ['*', 'auto', 'auto'], body: tblBody }, margin: [0, 0, 0, 12] },
                { text: 'Kindly Note that you are required to make your own arrangements for stay at the place of posting. We wish you all the best and hope to have a long and fruitful association.', fontSize: 11, margin: [0, 0, 0, 8] },
                { text: 'Regards', fontSize: 11, margin: [0, 0, 0, 5] },
                { text: 'Authorized Signatory', fontSize: 11, margin: [0, 0, 0, 3] },
                { text: `For ${companyName}`, fontSize: 11, margin: [0, 0, 0, 15] },
                { text: 'ACKNOWLEDGEMENT & ACCEPTANCE', bold: true, alignment: 'center', fontSize: 11, margin: [0, 0, 0, 10] },
                { text: 'DATE: __________', fontSize: 11, margin: [0, 0, 0, 5] },
                { text: '(SIGNATURE OF CANDIDATE)', alignment: 'right', fontSize: 11 }
            ];
        }

        var sigContent = signature
            ? [{ image: signature, height: 60, margin: [0, 8, 0, 4] }, { text: `Digitally signed by ${empName}`, fontSize: 9, color: '#555' }]
            : [{ text: '(Signature of Employee)', fontSize: 11 }];

        var mainContent = [
            { text: 'APPOINTMENT LETTER', bold: true, alignment: 'center', fontSize: 14, margin: [0, 0, 0, 15] },
            { columns: [
                { width: '60%', stack: [
                    { text: empName, bold: true, fontSize: 11 },
                    { text: `${salutationPrefix} ${emp.fatherName || ''}`, bold: true, fontSize: 11 },
                    { text: emp.permanentAddress || '', bold: true, fontSize: 11 }
                ]},
                { width: '40%', stack: [
                    { text: `Date: ${joiningFmt}`, bold: true, alignment: 'right', fontSize: 11 },
                    { text: `Ref No: ${refNo}`, bold: true, alignment: 'right', fontSize: 11 }
                ]}
            ], margin: [0, 0, 0, 10] },
            { text: '\n' },
            { text: `Dear ${empName},`, fontSize: 11, margin: [0, 0, 0, 8] },
            { text: `The management takes great pride in informing you that you have been appointed as ${designationName} in our company presently posted at ${companyAddress}, w.e.f ${joiningFmt}. You will be required to sign our NDA, Service Agreement and Separation Policy.`, fontSize: 11, margin: [0, 0, 0, 8] },
            { text: 'Your appointment shall be subject to the following terms and conditions:', fontSize: 11, margin: [0, 0, 0, 8] },
            // Terms 1-5
            { ol: [
                { text: 'That your probation will be of three months that can be extended based on your performance and confirmation will be written no deemed confirmation shall be effective on your employment.', fontSize: 11 },
                { text: 'That before completion of probation either party can terminate the employment without notice.', fontSize: 11 },
                { text: 'Your resignation will become effective and final upon acceptance by the Management not withstanding that the communication of the acceptance of resignation has reached you or not. However, it will be the prerogative of the Management to accept or not your resignation. In case of any misconduct on your part, your services can be terminated with immediate effect without assigning any reason and without giving to you any notice or notice pay in lieu of notice or any other claim, compensation or damages.', fontSize: 11 },
                { text: 'Your employment with the Company may be terminated after giving a notice of minimum 90 days (depend upon the position in company) or salary in lieu thereof. You are bound to give 90 days notice before leaving the services of the Company. You will ensure that all your on-going activities/projects are successfully completed and handed over as per the Company guidelines on the separation process. Depending upon business requirements, the Company may or may not accept your request to shorten serving of the notice period against the payment of salary in lieu of such shortened notice period. If you fail to serve notice and your on-going activities are not successfully completed and handed over by you, the company may take legal action against you to recover the monetary or other losses.', fontSize: 11 },
                { text: `That you will be paid monthly emoluments of Rs. ${ctcFmt}/- inclusive of Basic, and other allowances per month, subject to deduction of any statutory or other deductions (cost to company) as attached as Annexure "A".`, fontSize: 11 }
            ], margin: [0, 0, 0, 5] },
            // Terms 6-17 (page break before this block)
            { ol: [
                { text: 'That the bifurcation of your salary into various heads is at the sole discretion of the Management. The Management is further empowered to re-structure your salary at any time in future at its sole discretion.', fontSize: 11 },
                { text: 'That your increments will be based upon your all round performance in every six months, rather than once in a year and it based upon your professional efficiency, profitability of the establishment, your integrity, cost-effectiveness, discipline, punctuality, personal grooming, guest handling, staff handling etc. However, in case of your poor performance the increment can be withheld also at the sole discretion of the Management. Increments are neither automatic nor a right.', fontSize: 11 },
                { text: 'That you are liable to be transferred to any other location, establishment, outlet, unit, branch, subsidiary, associate, office, department, post or place etc.; situated anywhere in the country or otherwise; whether in existence presently or to be opened in future, wherever the Management has any interest. Upon such transfer you will be automatically governed by the service conditions, rules, regulations and other terms and conditions as applicable at such new place.', fontSize: 11 },
                { text: 'That you will be responsible for efficient and effective discharge of all functions in the establishment/ department, as the case may be, as required to be performed by your position, and as told to you by your superior or by the Management from time to time.', fontSize: 11 },
                { text: 'That since you are part of the Management Team, you will have no fixed duty hours or shifts, straight or broken, which will depend entirely upon the exigencies of business requirements, at the sole discretion of the Management. Your weekly off will also be liable to be staggered by the Management in the interest of business exigencies.', fontSize: 11 },
                { text: 'That you will directly and through your subordinates ensure proper and effective implementation and compliance of all relevant legal / statutory provisions.', fontSize: 11 },
                { text: 'That you will exercise overall responsibility of general management of the establishment/ department, as the case may be, or any other outlet / assignment assigned to you, and will run it with utmost efficiency as a successful profit center.', fontSize: 11 },
                { text: 'That if you will be authorized to act/sign documents/ appear before any court or authority on behalf of the Management. It is expected of you that you will do / commit / sign any documents strictly in the interest of the establishment and will not bind the Management by any illegal, unlawful and criminal liability, or anything unacceptable to the Management. In case you commit any breach of trust or privilege in such discharge of your duty, you will be personally liable for the consequences of your such acts and omissions.', fontSize: 11 },
                { text: 'That you will be accountable for maximizing the profitability and minimizing the costs, without compromising the standards / qualities / image of the establishment, and for always maintaining highest degree of standards in all areas of work / operation of the establishment / department, as the case may be.', fontSize: 11 },
                { text: "That it will be your responsibility to draw check-list of all do's and don'ts of all departments / your department, as the case may be, and to ensure their strict daily compliance by all concerned.", fontSize: 11 },
                { text: 'That you will ensure that the policies of the Company are fully enforced and carried out in the letter and spirit by the subordinates working under your control. You will enforce, implement and maintain highest of discipline, decorum, motivation and cordial industrial relations amongst all staff working under you.', fontSize: 11 },
                { text: 'That you will define the duties and responsibilities of your subordinates and monitor them, and to carefully give them necessary authority to take decisions wherever necessary and called for, but ultimately you will be responsible for their actions, omissions, commissions etc.', fontSize: 11 }
            ], start: 6, pageBreak: 'before', margin: [0, 0, 0, 5] },
            // Terms 18-26 (page break before this block)
            { ol: [
                { text: 'That you will identify the training needs of employees working under your control, and will arrange to provide them effective training from time to time.', fontSize: 11 },
                { text: 'That you will devote whole time to the business of the Company and shall diligently and efficiently carry out the duties entrusted to you by the Company from time to time. You will not accept, directly or indirectly at any time and other job / assignment or transact business of any kind directly or indirectly, during your employment with the Company, whether full time or part time, and whether with or without any remuneration or consideration.', fontSize: 11 },
                { text: 'That the company shall have the right to recover from you or from your salary and other claims any loss or damage suffered by the company due to your negligent act or otherwise and you shall have no objection to the same.', fontSize: 11 },
                { text: 'That the Management shall, in its absolute discretion, have the right to terminate your services without any enquiry or notice or pay in lieu thereof in the event of your conviction by a court of Law for any offense involving moral turpitude either before joining or during the period of your employment under the Company.', fontSize: 11 },
                { text: 'That should you remain absent from your work, without any information or prior written sanction of leave, and / or without any satisfactory explanation for more than 8 consecutive days, including absence when leave though applied for but not granted, or overstaying your sanctioned leave for more than 8 consecutive days without written sanction of extension of leave by the Management; it will be presumed that you are no longer working for the Company and that you have abandoned service of your service of your own accord, thereby terminating yourself from your employment. In such a case, you will not be liable to receive any statutory compensation.', fontSize: 11 },
                { text: 'That you will be required to take prior written permission from the Management for seeking admission / pursuing any educational course / higher education / professional studies, with any educational / professional institute. Such permission, when granted, shall always be subject to the condition that it does not in any way adversely affect the work of the establishment. In case the permission for study is granted, you may be sanctioned leave for actual days of examination only. However, in the exigencies of business the permission so granted or leave so sanctioned is liable to be withdrawn / cancelled.', fontSize: 11 },
                { text: 'That it is understood by you that this employment is being offered to you on the basis of the particulars / credentials furnished by you in / with your application for employment. If, at any time, should it emerge that the particulars / credentials as furnished by you are false / incorrect, or if any material information has been suppressed, this appointment shall automatically be rendered void and shall be liable to termination forthwith without any notice or compensation.', fontSize: 11 },
                { text: 'That you are required to submit with the HR Department / Office, documentary proof of your date of birth and self-certified copies of other credentials about your qualifications, experience etc. The date of birth once declared / document produced shall not be allowed to be changed at your request any time in future.', fontSize: 11 },
                { text: 'That your appointment / continuation in appointment in the Company shall be subject to your medical fitness, physically and mentally, by a doctor nominated by the Management. You will also be required to periodical medical checkup and inoculations etc. as and when directed by the Management.', fontSize: 11 }
            ], start: 18, pageBreak: 'before', margin: [0, 0, 0, 5] },
            // Terms 27-32 (page break before this block)
            { ol: [
                { text: 'That you will keep the Management informed of your permanent / present communication / residential addresses, and contact telephone / mobile numbers. You must communicate any change in them to the Management in writing within three days of such change. Any communication sent to you at your last known address shall be considered to have been served on you.', fontSize: 11 },
                { text: 'That you will not refuse to accept any communication of the Management. It will amount to an act of misconduct on your part. That Management may send such refused communication at your residence under certificate of posting, and it will be deemed to have been personally served on you.', fontSize: 11 },
                { text: 'That you will be entitled to leave and holidays as per law / rules of the Company.', fontSize: 11 },
                { text: 'You must have to discuss your reporting person before giving your resignation letter.', fontSize: 11 },
                { text: 'That you will be governed by the rules, regulations, service conditions, employee hand-book, notices, circulars, instructions etc. as are in force at present and as may be amended / formulated / invoked / introduced by the Management from time to time. That any or all the terms and conditions of your employment are subject to revision at any time at the sole discretion of the Management. That you will retire on attaining the age of 58 years.', fontSize: 11 },
                { text: 'That in case any dispute or difference arises in respect of the interpretation of your terms and conditions of service, or about any act or omission on your part; the decision of the Managing Director or of any person nominated by him in that matter shall be final and binding on you.', fontSize: 11 }
            ], start: 27, pageBreak: 'before', margin: [0, 0, 0, 8] },
            { text: 'In case the terms and conditions as mentioned above are acceptable to you, please sign on each page of the duplicate copy of this letter in token of your acceptance of them.', fontSize: 11, margin: [0, 0, 0, 8] },
            { text: 'We welcome you to the Quaere family and wish you good luck.', fontSize: 11, margin: [0, 0, 0, 8] },
            { text: 'Sincerely,', fontSize: 11, margin: [0, 0, 0, 20] },
            { text: 'Auth Signatory', bold: true, fontSize: 11, margin: [0, 0, 0, 3] },
            { text: companyName, fontSize: 11, margin: [0, 0, 0, 15] },
            { text: 'Acceptance:', bold: true, fontSize: 11, margin: [0, 0, 0, 5] },
            { text: `I, ${empName}, have carefully read and understood the terms and conditions of my appointment as mentioned herein above, and I agree and undertake to abide by them.`, fontSize: 11, margin: [0, 0, 0, 15] }
        ];
        sigContent.forEach(function(item) { mainContent.push(item); });
        annexureContent.forEach(function(item) { mainContent.push(item); });

        return {
            fileName: `appointment_letter_${emp.empCode || empName.replace(/ /g, '_')}_${Date.now()}.pdf`,
            doc: Object.assign({ pageSize: 'A4', pageMargins: margins }, bg, {
                content: mainContent,
                defaultStyle: { font: 'Roboto' }
            })
        };
    }

    if (type == 'relieving') {
        const refNo = data.refNo || '';
        const salutation = emp.gender === 'Female' ? 'Ms.' : 'Mr.';
        const rDateNodes = fmtDatePdf(data.relievingDate);
        const jDateNodes = fmtDatePdf(data.joiningDate || emp.joiningDate);
        const todayNodes = fmtDatePdf(new Date().toISOString());
        return {
            fileName: `relieving_letter_${emp.empCode || empName.replace(/ /g, '_')}_${Date.now()}.pdf`,
            doc: Object.assign({ pageSize: 'A4', pageMargins: margins }, bg, {
                content: [
                    { columns: [
                        { text: `Ref: Quaere/Emp/Relieving/${refNo}`, bold: true, fontSize: 10 },
                        { text: ['Dated: ', ...rDateNodes], bold: true, fontSize: 10, alignment: 'right' }
                    ], margin: [0, 0, 0, 12] },
                    { stack: [
                        { text: empName, fontSize: 10 },
                        { text: [{ text: `${salutationPrefix} ` }, { text: emp.fatherName || '', bold: true }], fontSize: 10 },
                        { text: emp.permanentAddress || '', fontSize: 10 }
                    ], margin: [0, 0, 0, 18] },
                    { text: [{ text: 'Subject: ' }, { text: 'Relieving Cum Experience Letter', bold: true, decoration: 'underline' }], fontSize: 10, margin: [0, 0, 0, 12] },
                    { text: `Dear ${salutation} ${empName},`, bold: true, fontSize: 10, margin: [0, 0, 0, 10] },
                    { text: ['You are hereby relieved from the services of the company by the closing hours of ', ...rDateNodes, '.'], fontSize: 10, margin: [0, 0, 0, 7] },
                    { text: ['We wish to place on record that you had been under the employment from ', ...jDateNodes, ' to ', ...rDateNodes, ` with the current position as ${designationName || '_______________'}.`], fontSize: 10, margin: [0, 0, 0, 7] },
                    { text: 'All the dues will be paid to you as Full & Final Settlement.', fontSize: 10, margin: [0, 0, 0, 7] },
                    { text: 'We thank you for your contribution to the Company and wish you all success in your future endeavors.', fontSize: 10, margin: [0, 0, 0, 35] },
                    { text: 'With warm regards,', fontSize: 10, margin: [0, 0, 0, 18] },
                    { text: 'Human Resource Department', bold: true, fontSize: 10, margin: [0, 0, 0, 3] },
                    { text: ['Date: ', ...todayNodes], fontSize: 10 }
                ],
                defaultStyle: { font: 'Roboto' }
            })
        };
    }
    return null;
};

const savePdf = async (docDefinition, fileName) => {
    const filePath = path.join(__dirname, '../../../uploads/pdfs', fileName);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    const pdfDoc = letterPrinter.createPdfKitDocument(docDefinition);
    const writeStream = fs.createWriteStream(filePath);
    pdfDoc.pipe(writeStream);
    pdfDoc.end();
    await new Promise((resolve, reject) => {
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
    });
    return `${process.env.BASE_URL}/uploads/pdfs/${fileName}`;
};

exports.generateAllLettersPdf = async (req, res) => {
    const tenantId = req.users && req.users.tenantId;
    const branchId = req.users && req.users.branchId;
    const employeeId = req.users && req.users.id;

    if (!branchId) return Helper.response(false, 'branchId is required!', {}, res, 200);
    if (!employeeId) return Helper.response(false, 'Employee not found', {}, res, 400);

    try {
        const [emp, records, tenant] = await Promise.all([
            empPersonal.findOne({ where: { id: employeeId, tenantId, branchId }, raw: true }),
            LetterData.findAll({ where: { tenantId, branchId, employeeId, type: ['appointment', 'offer', 'relieving'] } }),
            Tenant.findOne({ where: { id: tenantId }, attributes: ['companyName', 'companyAddress', 'letterhead'], raw: true })
        ]);

        if (!emp) return Helper.response(false, 'Employee not found', {}, res, 404);

        const [designation, department] = await Promise.all([
            emp.designationId ? Designation.findOne({ where: { id: emp.designationId, tenantId }, raw: true }) : null,
            emp.departmentId ? Department.findOne({ where: { id: emp.departmentId, tenantId }, raw: true }) : null
        ]);

        const result = { appointment: null, offer: null, relieving: null };

        for (const record of records) {
            const lhB64 = getLetterheadBase64(record.type, tenant && tenant.letterhead);
            const built = buildLetterDoc(record.type, emp, record.data || {}, designation, department, tenant, lhB64);
            if (built) {
                result[record.type] = await savePdf(built.doc, built.fileName);
            }
        }

        const generated = Object.values(result).filter(Boolean).length;
        if (generated === 0) {
            return Helper.response(false, 'No letter data found. Please generate letters first.', result, res, 404);
        }

        return Helper.response(true, `${generated} PDF(s) generated successfully`, result, res, 200);
    } catch (error) {
        console.error('Error generating all letter PDFs:', error);
        return Helper.response(false, 'Internal server error', {}, res, 500);
    }
};

exports.generateLetterPdf = async (req, res) => {
    const { employeeId, type } = req.body;
    const tenantId = req.users && req.users.tenantId;
    const branchId = req.users && req.users.branchId;
    if (!branchId) return Helper.response(false, 'branchId is required!', {}, res, 200);
    if (!employeeId || !type) return Helper.response(false, 'employeeId and type are required', {}, res, 400);
    if (!['appointment', 'offer', 'relieving'].includes(type)) {
        return Helper.response(false, 'Invalid letter type', {}, res, 400);
    }

    try {
        const [emp, record, tenant] = await Promise.all([
            empPersonal.findOne({ where: { id: employeeId, tenantId, branchId }, raw: true }),
            LetterData.findOne({ where: { tenantId, branchId, employeeId, type } }),
            Tenant.findOne({ where: { id: tenantId }, attributes: ['companyName', 'companyAddress', 'letterhead'], raw: true })
        ]);

        if (!emp) return Helper.response(false, 'Employee not found', {}, res, 404);
        if (!record) return Helper.response(false, 'Letter data not found. Please generate the letter first.', {}, res, 404);

        const [designation, department] = await Promise.all([
            emp.designationId ? Designation.findOne({ where: { id: emp.designationId, tenantId }, raw: true }) : null,
            emp.departmentId ? Department.findOne({ where: { id: emp.departmentId, tenantId }, raw: true }) : null
        ]);

        const lhB64 = getLetterheadBase64(type, tenant && tenant.letterhead);
        const built = buildLetterDoc(type, emp, record.data || {}, designation, department, tenant, lhB64);
        if (!built) return Helper.response(false, 'Invalid letter type', {}, res, 400);

        const downloadUrl = await savePdf(built.doc, built.fileName);
        return Helper.response(true, 'PDF generated successfully', { downloadUrl }, res, 200);
    } catch (error) {
        console.error('Error generating letter PDF:', error);
        return Helper.response(false, 'Internal server error', {}, res, 500);
    }
};
