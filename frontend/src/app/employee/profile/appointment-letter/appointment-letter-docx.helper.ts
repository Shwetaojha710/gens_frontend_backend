/**
 * Appointment Letter → real DOCX (Word-native).
 * Formatting calibrated against the reference Appointment Letter DOCX.
 * Used only by downloadDoc(); print/preview must not import this.
 */
import {
  AlignmentType,
  BorderStyle,
  Document,
  LevelFormat,
  Packer,
  PageBreak,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from 'docx';

export interface AppointmentDocxDateParts {
  day: number;
  suffix: string;
  month: string;
  year: number;
}

export interface AppointmentDocxInput {
  firstName: string;
  lastName: string;
  fatherName: string;
  gender: string;
  permanentAddress: string;
  designation: string;
  joiningDate: string;
  joiningDateOrdinal: string;
  /** When set, ordinal suffix (st/nd/rd/th) is rendered as superscript */
  joiningDateParts?: AppointmentDocxDateParts | null;
  joiningDateNumeric: string;
  refNo: string;
  companyName: string;
  location: string;
  ctc: number;
  monthlyCtc: number;
  salaryTable: {
    earnings: Array<{ name?: string; component_name?: string; finalAmount?: number }>;
    deductions: Array<{ name?: string; component_name?: string; finalAmount?: number }>;
    totalEarning: number;
    totalDeduction: number;
    netSalary: number;
  };
  ctcInWords: string;
}

/** Reference Normal style = Calibri */
const FONT = 'Calibri';

/** Half-points (Word sz): 28=14pt title, 22=11pt body, 24=12pt table, 20=10pt small */
const SZ_TITLE = 28;
const SZ_BODY = 22;
const SZ_CLAUSE = 22;
const SZ_SMALL = 20;
const SZ_TABLE = 24;

/**
 * Reference sectPr (page 1):
 * pgSz 11910×16840, pgMar top=1920 right=992 bottom=280 left=992
 */
const PAGE_W = 11910;
const PAGE_H = 16840;
const MARGIN = {
  top: 1920,
  bottom: 280,
  left: 992,
  right: 992,
};

/** Content width between left/right margins */
const CONTENT_W = PAGE_W - MARGIN.left - MARGIN.right; // 9926

/** Single line (240) — primary reference line spacing */
const LINE_SINGLE = { line: 240, lineRule: 'auto' as const };
const LINE_EXACT_273 = { line: 273, lineRule: 'exact' as const };

const AFTER_SM = 60;
const AFTER_MD = 120;
const AFTER_LG = 200;
const BEFORE_CLAUSE = 120;

const thinBorder = {
  style: BorderStyle.SINGLE,
  size: 8,
  color: '000000',
};
const borders = {
  top: thinBorder,
  bottom: thinBorder,
  left: thinBorder,
  right: thinBorder,
};
const noBorder = {
  style: BorderStyle.NONE,
  size: 0,
  color: 'FFFFFF',
};
const noBorders = {
  top: noBorder,
  bottom: noBorder,
  left: noBorder,
  right: noBorder,
};

function run(
  text: string,
  opts: {
    bold?: boolean;
    underline?: boolean;
    size?: number;
    break?: number;
    superScript?: boolean;
  } = {},
): TextRun {
  return new TextRun({
    text,
    font: FONT,
    size: opts.size ?? SZ_BODY,
    bold: !!opts.bold,
    underline: opts.underline ? {} : undefined,
    break: opts.break,
    superScript: !!opts.superScript,
  });
}

/** e.g. 3<sup>rd</sup> July, 2025 */
function ordinalDateRuns(
  data: AppointmentDocxInput,
  opts: { bold?: boolean; size?: number } = {},
): TextRun[] {
  const bold = opts.bold ?? true;
  const size = opts.size ?? SZ_BODY;
  const parts = data.joiningDateParts;
  if (parts?.day != null && parts.suffix && parts.month && parts.year != null) {
    return [
      run(String(parts.day), { bold, size }),
      run(parts.suffix, { bold, size, superScript: true }),
      run(` ${parts.month}, ${parts.year}`, { bold, size }),
    ];
  }
  return [run(data.joiningDateOrdinal || '', { bold, size })];
}

function p(
  children: TextRun[] | string,
  opts: {
    align?: (typeof AlignmentType)[keyof typeof AlignmentType];
    spacingAfter?: number;
    spacingBefore?: number;
    indent?: { left?: number; hanging?: number; right?: number };
    line?: { line: number; lineRule: 'auto' | 'exact' };
  } = {},
): Paragraph {
  const kids =
    typeof children === 'string' ? [run(children)] : children.length ? children : [run('')];
  return new Paragraph({
    children: kids,
    alignment: opts.align ?? AlignmentType.LEFT,
    spacing: {
      after: opts.spacingAfter ?? AFTER_SM,
      before: opts.spacingBefore ?? 0,
      ...(opts.line ?? LINE_SINGLE),
    },
    indent: opts.indent,
  });
}

function blank(lines = 1): Paragraph[] {
  return Array.from({ length: lines }, () =>
    p('', { spacingAfter: 40, spacingBefore: 40 }),
  );
}

function pageBreak(): Paragraph {
  return new Paragraph({ children: [new PageBreak()] });
}

function fmtAmt(n: number): string {
  const v = Math.round(Number(n) || 0);
  return v.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function genderKey(gender: string): 'male' | 'female' | 'other' {
  const g = String(gender || '').trim().toLowerCase();
  if (g === 'female' || g === 'f') return 'female';
  if (g === 'male' || g === 'm') return 'male';
  return 'other';
}

function genderTitle(gender: string): string {
  const g = genderKey(gender);
  if (g === 'female') return 'Ms. ';
  if (g === 'male') return 'Mr. ';
  return '';
}

function relationPrefix(gender: string): string {
  const g = genderKey(gender);
  if (g === 'female') return 'D/O Mr. ';
  if (g === 'male') return 'S/O Mr. ';
  return 'C/O ';
}

function stripHonorific(name: string): string {
  return String(name || '')
    .replace(/^\s*(mr\.?|mrs\.?|ms\.?|miss)\s+/i, '')
    .trim();
}

function addressLines(address: string): string[] {
  return String(address || '')
    .replace(/\\r\\n|\\n|\\r/g, '\n')
    .split(/\r\n|\r|\n/)
    .map((l) => l.replace(/\s+$/g, ''))
    .filter((l) => l.length > 0);
}

const TERMS: string[] = [
  'That your probation will be of three months that can be extended based on your performance and confirmation will be written no deemed confirmation shall be effective on your employment.',
  'That before completion of probation either party can terminate the employment without notice.',
  'Your resignation will become effective and final upon acceptance by the Management not withstanding that the communication of the acceptance of resignation has reached you or not. However, it will be the prerogative of the Management to accept or not your resignation. In case of any misconduct on your part, your services can be terminated with immediate effect without assigning any reason and without giving to you any notice or notice pay in lieu of notice or any other claim, compensation or damages.',
  'Your employment with the Company may be terminated after giving a notice of minimum 90 days (depend upon the position in company) or salary in lieu thereof. You are bound to give 90 days notice before leaving the services of the Company. You will ensure that all your on-going activities/projects are successfully completed and handed over as per the Company guidelines on the separation process. Depending upon business requirements, the Company may or may not accept your request to shorten serving of the notice period against the payment of salary in lieu of such shortened notice period. If you fail to serve notice and your on-going activities are not successfully completed and handed over by you, the company may take legal action against you to recover the monetary or other losses.',
  '', // salary clause — filled dynamically
  'That the bifurcation of your salary into various heads is at the sole discretion of the Management. The Management is further empowered to re-structure your salary at any time in future at its sole discretion.',
  'That your increments will be based upon your all round performance in every six months, rather than once in a year and it based upon your professional efficiency, profitability of the establishment, your integrity, cost-effectiveness, discipline, punctuality, personal grooming, guest handling, staff handling etc. However, in case of your poor performance the increment can be withheld also at the sole discretion of the Management. Increments are neither automatic nor a right.',
  'That you are liable to be transferred to any other location, establishment, outlet, unit, branch, subsidiary, associate, office, department, post or place etc.; situated anywhere in the country or otherwise; whether in existence presently or to be opened in future, wherever the Management has any interest. Upon such transfer you will be automatically governed by the service conditions, rules, regulations and other terms and conditions as applicable at such new place.',
  'That you will be responsible for efficient and effective discharge of all functions in the establishment/ department, as the case may be, as required to be performed by your position, and as told to you by your superior or by the Management from time to time.',
  'That since you are part of the Management Team, you will have no fixed duty hours or shifts, straight or broken, which will depend entirely upon the exigencies of business requirements, at the sole discretion of the Management. Your weekly off will also be liable to be staggered by the Management in the interest of business exigencies.',
  'That you will directly and through your subordinates ensure proper and effective implementation and compliance of all relevant legal / statutory provisions.',
  'That you will exercise overall responsibility of general management of the establishment/ department, as the case may be, or any other outlet / assignment assigned to you, and will run it with utmost efficiency as a successful profit center.',
  'That if you will be authorized to act/sign documents/ appear before any court or authority on behalf of the Management. It is expected of you that you will do / commit / sign any documents strictly in the interest of the establishment and will not bind the Management by any illegal, unlawful and criminal liability, or anything unacceptable to the Management. In case you commit any breach of trust or privilege in such discharge of your duty, you will be personally liable for the consequences of your such acts and omissions.',
  'That you will be accountable for maximizing the profitability and minimizing the costs, without compromising the standards / qualities / image of the establishment, and for always maintaining highest degree of standards in all areas of work / operation of the establishment / department, as the case may be.',
  'That it will be your responsibility to draw check-list of all do’s and don’ts of all departments / your department, as the case may be, and to ensure their strict daily compliance by all concerned.',
  'That you will ensure that the policies of the Company are fully enforced and carried out in the letter and spirit by the subordinates working under your control. You will enforce, implement and maintain highest of discipline, decorum, motivation and cordial industrial relations amongst all staff working under you.',
  'That you will define the duties and responsibilities of your subordinates and monitor them, and to carefully give them necessary authority to take decisions wherever necessary and called for, but ultimately you will be responsible for their actions, omissions, commissions etc.',
  'That you will identify the training needs of employees working under your control, and will arrange to provide them effective training from time to time.',
  'That you will devote whole time to the business of the Company and shall diligently and efficiently carry out the duties entrusted to you by the Company from time to time. You will not accept, directly or indirectly at any time and other job / assignment or transact business of any kind directly or indirectly, during your employment with the Company, whether full time or part time, and whether with or without any remuneration or consideration.',
  'That your position is part of the Management Team, and requires highest degree of trust, confidence, confidentiality and integrity on your part. You will not divulge any classified / secret / confidential / trade / process information about the Company, which you will get to know while working with us; to any other person, Company, body etc.; neither during your employment with us, nor after leaving the same. You are not allowed to possess any property / document /CD / Floppy / photocopy etc. of the Company, or take them away out of your place of work, that belongs to the company, without express written permission of the Management.',
  'That the company shall have the right to recover from you or from your salary and other claims any loss or damage suffered by the company due to your negligent act or otherwise and you shall have no objection to the same.',
  'That the Management shall, in its absolute discretion, have the right to terminate your services without any enquiry or notice or pay in lieu thereof in the event of your conviction by a court of Law for any offense involving moral turpitude either before joining or during the period of your employment under the Company.',
  'That should you remain absent from your work, without any information or prior written sanction of leave, and / or without any satisfactory explanation for more than 8 consecutive days, including absence when leave though applied for but not granted, or overstaying your sanctioned leave for more than 8 consecutive days without written sanction of extension of leave by the Management; it will be presumed that you are no longer working for the Company and that you have abandoned service of your service of your own accord, thereby terminating yourself from your employment. In such a case, you will not be liable to receive any statutory compensation.',
  'That you will be required to take prior written permission from the Management for seeking admission / pursuing any educational course / higher education / professional studies, with any educational / professional institute. Such permission, when granted, shall always be subject to the condition that it does not in any way adversely affect the work of the establishment. In case the permission for study is granted, you may be sanctioned leave for actual days of examination only. However, in the exigencies of business the permission so granted or leave so sanctioned is liable to be withdrawn / cancelled.',
  'That it is understood by you that this employment is being offered to you on the basis of the particulars / credentials furnished by you in / with your application for employment. If, at any time, should it emerge that the particulars / credentials as furnished by you are false / incorrect, or if any material information has been suppressed, this appointment shall automatically be rendered void and shall be liable to termination forthwith without any notice or compensation.',
  'That you are required to submit with the HR Department / Office, documentary proof of your date of birth and self-certified copies of other credentials about your qualifications, experience etc. The date of birth once declared / document produced shall not be allowed to be changed at your request any time in future.',
  'That your appointment / continuation in appointment in the Company shall be subject to your medical fitness, physically and mentally, by a doctor nominated by the Management. You will also be required to periodical medical checkup and inoculations etc. as and when directed by the Management.',
  'That you will keep the Management informed of your permanent / present communication / residential addresses, and contact telephone / mobile numbers. You must communicate any change in them to the Management in writing within three days of such change. Any communication sent to you at your last known address shall be considered to have been served on you.',
  'That you will not refuse to accept any communication of the Management. It will amount to an act of misconduct on your part. That Management may send such refused communication at your residence under certificate of posting, and it will be deemed to have been personally served on you.',
  'That you will be entitled to leave and holidays as per law / rules of the Company.',
  'You must have to discuss your reporting person before giving your resignation letter.',
  'That you will be governed by the rules, regulations, service conditions, employee hand-book, notices, circulars, instructions etc. as are in force at present and as may be amended / formulated / invoked / introduced by the Management from time to time. That any or all the terms and conditions of your employment are subject to revision at any time at the sole discretion of the Management. That you will retire on attaining the age of 58 years.',
  'That in case any dispute or difference arises in respect of the interpretation of your terms and conditions of service, or about any act or omission on your part; the decision of the Managing Director or of any person nominated by him in that matter shall be final and binding on you,',
];

/** Indices (1-based) matching HTML template `.force-page-break` clauses */
const PAGE_BREAK_BEFORE_CLAUSE = new Set([6, 18, 28]);

function cell(
  text: string,
  opts: {
    bold?: boolean;
    align?: (typeof AlignmentType)[keyof typeof AlignmentType];
    width: number;
    colspan?: number;
  },
): TableCell {
  return cellRuns([run(text, { bold: opts.bold, size: SZ_TABLE })], opts);
}

function cellRuns(
  children: TextRun[],
  opts: {
    align?: (typeof AlignmentType)[keyof typeof AlignmentType];
    width: number;
    colspan?: number;
  },
): TableCell {
  return new TableCell({
    width: { size: opts.width, type: WidthType.DXA },
    borders,
    verticalAlign: VerticalAlign.CENTER,
    columnSpan: opts.colspan,
    children: [
      new Paragraph({
        alignment: opts.align ?? AlignmentType.LEFT,
        spacing: { after: 20, before: 20, ...LINE_EXACT_273 },
        children: children.length ? children : [run('')],
      }),
    ],
  });
}

/** Split "PF Employee Contribution" → bold name + normal " Contribution" */
function benefitLabelRuns(baseName: string): TextRun[] {
  const name = String(baseName || '').trim();
  if (!name) return [run('', { size: SZ_TABLE })];

  if (/re-?imburs/i.test(name)) {
    return [run(name, { size: SZ_TABLE })];
  }

  const contribMatch = name.match(/^(.*?)(\s+Contribution)$/i);
  if (contribMatch) {
    return [
      run(contribMatch[1].trim(), { bold: true, size: SZ_TABLE }),
      run(' Contribution', { size: SZ_TABLE }),
    ];
  }

  // component_name without "Contribution" suffix (HTML template style)
  return [
    run(name, { bold: true, size: SZ_TABLE }),
    run(' Contribution', { size: SZ_TABLE }),
  ];
}

function buildSalaryTable(data: AppointmentDocxInput): Table {
  const fullWidth = CONTENT_W;
  const c1 = Math.round(fullWidth * 0.42);
  const c2 = Math.round(fullWidth * 0.29);
  const c3 = fullWidth - c1 - c2;
  const st = data.salaryTable || {
    earnings: [],
    deductions: [],
    totalEarning: 0,
    totalDeduction: 0,
    netSalary: 0,
  };

  const rows: TableRow[] = [
    new TableRow({
      children: [
        cell('Particulars', { bold: true, align: AlignmentType.CENTER, width: c1 }),
        cell('Annual Remuneration', { bold: true, align: AlignmentType.CENTER, width: c2 }),
        cell('Monthly Remuneration', { bold: true, align: AlignmentType.CENTER, width: c3 }),
      ],
    }),
    new TableRow({
      children: [
        cell('Gross Remuneration', { bold: true, width: c1 }),
        cell(fmtAmt(st.totalEarning), { bold: true, align: AlignmentType.RIGHT, width: c2 }),
        cell(fmtAmt(st.totalEarning / 12), { bold: true, align: AlignmentType.RIGHT, width: c3 }),
      ],
    }),
  ];

  for (const item of st.earnings || []) {
    const amt = Number(item.finalAmount || 0);
    rows.push(
      new TableRow({
        children: [
          cell(String(item.name || item.component_name || ''), { width: c1 }),
          cell(fmtAmt(amt), { bold: true, align: AlignmentType.RIGHT, width: c2 }),
          cell(fmtAmt(amt / 12), { align: AlignmentType.RIGHT, width: c3 }),
        ],
      }),
    );
  }

  rows.push(
    new TableRow({
      children: [
        cell('Parts of Benefits', { bold: true, width: c1 }),
        cell('', { width: c2 }),
        cell('', { width: c3 }),
      ],
    }),
  );

  for (const item of st.deductions || []) {
    const amt = Number(item.finalAmount || 0);
    const baseName = String(item.component_name || item.name || '').trim();
    rows.push(
      new TableRow({
        children: [
          cellRuns(benefitLabelRuns(baseName), { width: c1 }),
          cell(fmtAmt(amt), { align: AlignmentType.RIGHT, width: c2 }),
          cell(fmtAmt(amt / 12), { align: AlignmentType.RIGHT, width: c3 }),
        ],
      }),
    );
  }

  rows.push(
    new TableRow({
      children: [
        cell('In Hand Remuneration', { bold: true, width: c1 }),
        cell(fmtAmt(st.netSalary), { bold: true, align: AlignmentType.RIGHT, width: c2 }),
        cell(fmtAmt(st.netSalary / 12), { bold: true, align: AlignmentType.RIGHT, width: c3 }),
      ],
    }),
    new TableRow({
      children: [
        cell('Total Cost to the Company (Annual)', { bold: true, width: c1 }),
        cell(fmtAmt(data.ctc), { bold: true, align: AlignmentType.RIGHT, width: c2 }),
        cell(fmtAmt(data.ctc / 12), { bold: true, align: AlignmentType.RIGHT, width: c3 }),
      ],
    }),
    new TableRow({
      children: [
        new TableCell({
          columnSpan: 3,
          width: { size: fullWidth, type: WidthType.DXA },
          borders,
          children: [
            new Paragraph({
              spacing: { after: 20, before: 20, ...LINE_EXACT_273 },
              children: [
                run('Annual Cost to Company (In Words) - ', { bold: true, size: SZ_TABLE }),
                run(`${data.ctcInWords || 'zero'} only.`, { size: SZ_TABLE }),
              ],
            }),
          ],
        }),
      ],
    }),
  );

  return new Table({
    width: { size: fullWidth, type: WidthType.DXA },
    columnWidths: [c1, c2, c3],
    rows,
  });
}

function buildHeaderTable(data: AppointmentDocxInput): Table {
  const leftW = Math.round(CONTENT_W * 0.55);
  const rightW = CONTENT_W - leftW;
  const name = `${genderTitle(data.gender)}${data.firstName} ${data.lastName}`.trim();
  const father = data.fatherName
    ? `${relationPrefix(data.gender)}${stripHonorific(data.fatherName)}`
    : '';
  const addr = addressLines(data.permanentAddress);

  const leftChildren: Paragraph[] = [
    p([run(`${name},`, { bold: true, size: SZ_BODY })], {
      spacingAfter: 0,
      spacingBefore: 95,
    }),
  ];
  if (father) {
    leftChildren.push(
      p([run(`${father},`, { bold: true, size: SZ_BODY })], {
        spacingAfter: 0,
        spacingBefore: 1,
      }),
    );
  }
  for (let i = 0; i < addr.length; i++) {
    leftChildren.push(
      p([run(addr[i], { bold: true, size: SZ_BODY })], {
        spacingAfter: 0,
        spacingBefore: 0,
      }),
    );
  }

  const rightChildren: Paragraph[] = [
    p(
      [
        run('Date: ', { bold: true, size: SZ_BODY }),
        ...ordinalDateRuns(data, { bold: true, size: SZ_BODY }),
      ],
      { align: AlignmentType.RIGHT, spacingAfter: 0, spacingBefore: 95 },
    ),
    p(
      [
        run('Ref. No: ', { bold: true, size: SZ_BODY }),
        run(data.refNo || '', { bold: true, size: SZ_BODY }),
      ],
      { align: AlignmentType.RIGHT, spacingAfter: 0, spacingBefore: 1 },
    ),
  ];

  return new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: [leftW, rightW],
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: leftW, type: WidthType.DXA },
            borders: noBorders,
            children: leftChildren.length ? leftChildren : [p('')],
          }),
          new TableCell({
            width: { size: rightW, type: WidthType.DXA },
            borders: noBorders,
            children: rightChildren,
          }),
        ],
      }),
    ],
  });
}

function clauseParagraph(n: number, runs: TextRun[]): Paragraph {
  return new Paragraph({
    numbering: { reference: 'terms-numbering', level: 0 },
    alignment: AlignmentType.BOTH,
    spacing: {
      before: n === 1 ? 1 : BEFORE_CLAUSE,
      after: 0,
      ...LINE_SINGLE,
    },
    children: runs,
  });
}

export async function generateAppointmentDocxBlob(
  data: AppointmentDocxInput,
): Promise<Blob> {
  const company = data.companyName || 'Quaere Etechnologies Pvt Ltd';
  const location = data.location || 'Lucknow';
  const designation = data.designation || '_______________';
  const monthly = Math.round(Number(data.monthlyCtc || data.ctc / 12) || 0);
  const dearName = `${genderTitle(data.gender)}${data.firstName || ''}`.trim();
  const fullName = `${data.firstName || ''} ${data.lastName || ''}`.replace(/\s+/g, ' ').trim();

  const children: (Paragraph | Table)[] = [];

  // Title — Heading1-like: 14pt bold underline center
  children.push(
    p(
      [run('APPOINTMENT LETTER', { bold: true, underline: true, size: SZ_TITLE })],
      { align: AlignmentType.CENTER, spacingAfter: AFTER_LG, spacingBefore: 243 },
    ),
  );

  children.push(buildHeaderTable(data));
  children.push(...blank(1));
  children.push(...blank(1));
  children.push(
    p([run(`Dear ${dearName},`, { bold: true, size: SZ_BODY })], {
      spacingAfter: AFTER_SM,
      spacingBefore: 1,
    }),
  );
  children.push(...blank(1));
  children.push(
    p(
      [
        run(
          'The management takes great pride in informing you that you have been appointed as “',
          { size: SZ_BODY },
        ),
        run(designation, { bold: true, size: SZ_BODY }),
        run('” in our company presently posted at ', { size: SZ_BODY }),
        run(`${location},`, { bold: true, size: SZ_BODY }),
        run(' w.e.f ', { size: SZ_BODY }),
        ...ordinalDateRuns(data, { bold: true, size: SZ_BODY }),
        run(
          '. You will be required to sign our NDA, Service Agreement and Separation Policy.',
          { size: SZ_BODY },
        ),
      ],
      { align: AlignmentType.BOTH, spacingAfter: AFTER_MD, spacingBefore: 40 },
    ),
  );

  children.push(
    p('Your appointment shall be subject to the following terms and conditions:-', {
      spacingAfter: AFTER_SM,
      spacingBefore: 267,
    }),
  );

  TERMS.forEach((text, idx) => {
    const n = idx + 1;
    if (PAGE_BREAK_BEFORE_CLAUSE.has(n)) {
      children.push(pageBreak());
    }

    let clauseRuns: TextRun[];
    if (n === 5) {
      clauseRuns = [
        run('That you will be paid monthly emoluments of ', { size: SZ_CLAUSE }),
        run(`Rs. ${fmtAmt(monthly)}/-`, { bold: true, size: SZ_CLAUSE }),
        run(
          ' inclusive of Basic, and other allowances per month, subject to deduction of any statutory or other deductions (cost to company) as attached as Annexure “A”.',
          { size: SZ_CLAUSE },
        ),
      ];
    } else {
      clauseRuns = [run(text, { size: SZ_CLAUSE })];
    }

    children.push(clauseParagraph(n, clauseRuns));
  });

  children.push(
    p(
      'In case the terms and conditions as mentioned above are acceptable to you, please sign on each page of the duplicate copy of this letter in token of your acceptance of them.',
      { spacingAfter: AFTER_MD, spacingBefore: BEFORE_CLAUSE },
    ),
  );

  children.push(
    p(
      [
        run('We welcome you to the ', { size: SZ_BODY }),
        run('Quaere', { bold: true, size: SZ_BODY }),
        run(' family and wish you good luck.', { size: SZ_BODY }),
      ],
      { spacingAfter: AFTER_MD },
    ),
  );

  children.push(p('Sincerely,', { spacingAfter: AFTER_SM }));
  children.push(...blank(3));
  children.push(p([run('Auth Signatory', { bold: true, size: SZ_SMALL })], { spacingAfter: 40 }));
  children.push(p([run(company, { bold: true, size: SZ_SMALL })], { spacingAfter: AFTER_MD }));
  children.push(...blank(2));

  children.push(p([run('Acceptance:', { bold: true, size: SZ_SMALL })], { spacingAfter: AFTER_SM }));
  children.push(
    p(
      [
        run('I, ', { size: SZ_SMALL }),
        run(fullName, { bold: true, size: SZ_SMALL }),
        run(
          ' have carefully read and understood the terms and conditions of my appointment as mentioned herein above, and I agree and undertake to abide by them.',
          { size: SZ_SMALL },
        ),
      ],
      { spacingAfter: AFTER_MD },
    ),
  );
  children.push(...blank(4));
  children.push(
    p([run('(Signature of the Employee)', { bold: true, size: SZ_SMALL })], {
      spacingAfter: AFTER_LG,
    }),
  );

  // Annexure (template force-page-break)
  children.push(pageBreak());
  children.push(
    p([run('Annexure “A”', { bold: true, underline: true, size: SZ_TITLE })], {
      align: AlignmentType.CENTER,
      spacingAfter: AFTER_MD,
      spacingBefore: 200,
    }),
  );
  children.push(
    p([run('Cost to Company Details', { bold: true, underline: true, size: SZ_BODY })], {
      align: AlignmentType.CENTER,
      spacingAfter: AFTER_MD,
    }),
  );
  children.push(
    p(
      [
        run('In continuation to our appointment letter dated ', { size: SZ_SMALL }),
        run(data.joiningDateNumeric || '', { bold: true, size: SZ_SMALL }),
        run(
          ' mentioned above, please note that the breakup of your salary will be as follows:-',
          { size: SZ_SMALL },
        ),
      ],
      { spacingAfter: AFTER_MD },
    ),
  );
  children.push(
    p([run('Salary Annexure', { bold: true, underline: true, size: SZ_BODY })], {
      align: AlignmentType.CENTER,
      spacingAfter: AFTER_MD,
    }),
  );

  children.push(buildSalaryTable(data));
  children.push(...blank(1));

  children.push(
    p(
      'Kindly Note that you are required to make your own arrangements for stay at the place of posting. We wish you all the best and hope to have a long and fruitful association.',
      { spacingAfter: AFTER_MD, spacingBefore: AFTER_SM },
    ),
  );
  children.push(p('Regards', { spacingAfter: AFTER_SM }));
  children.push(...blank(3));
  children.push(p('Authorized Signatory', { spacingAfter: 40 }));
  children.push(
    p(
      [run('for ', { size: SZ_SMALL }), run(company, { bold: true, size: SZ_SMALL })],
      { spacingAfter: AFTER_LG },
    ),
  );

  children.push(
    p(
      [run('ACKNOWLEDGEMENT & ACCEPTANCE', { bold: true, underline: true, size: SZ_BODY })],
      { align: AlignmentType.CENTER, spacingAfter: AFTER_LG },
    ),
  );
  children.push(p([run('DATE :', { size: SZ_SMALL })], { spacingAfter: AFTER_LG }));
  children.push(
    p([run('(SIGNATURE OF CANDIDATE)', { bold: true, size: SZ_SMALL })], {
      align: AlignmentType.RIGHT,
      spacingAfter: AFTER_MD,
    }),
  );

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: FONT,
            size: SZ_BODY,
          },
        },
      },
    },
    numbering: {
      config: [
        {
          reference: 'terms-numbering',
          levels: [
            {
              level: 0,
              format: LevelFormat.DECIMAL,
              text: '%1.',
              alignment: AlignmentType.LEFT,
              style: {
                paragraph: {
                  indent: { left: 861, hanging: 360 },
                },
                run: {
                  font: FONT,
                  size: SZ_CLAUSE,
                },
              },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            margin: MARGIN,
            size: {
              width: PAGE_W,
              height: PAGE_H,
            },
          },
        },
        children,
      },
    ],
  });

  return Packer.toBlob(doc);
}

export function downloadAppointmentBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
