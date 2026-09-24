import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Notyf } from 'notyf';
import { EmployeeService } from '../../../services/employee.service';
import { PayrollService } from '../../../services/payroll.service';

@Component({
  selector: 'app-service-agreement',
  imports: [CommonModule, FormsModule],
  templateUrl: './service-agreement.component.html',
  styleUrl: './service-agreement.component.css'
})
export class ServiceAgreementComponent {
  notyf: Notyf;
  tenant: any = {};
  personalDetails: any = {};
  /** Dynamic salary rows from payroll (monthly) */
  salaryComponents: { name: string; amount: number }[] = [];

  /** Editable / saved letter fields */
  form: any = {
    serialNumber: '11 AB',
    representativeName: 'Sanjay Sharma',
    representativeTitle: 'Senior Vice President',
    suretyName: '',
    suretyRelation: '',
    suretyAge: '',
    location: 'Lucknow',
    coverServiceMonths: 24,
    servicePeriodMonths: 18,
    ftMonths: 6,
    ctc: 0,
    basic: 0,
    hra: 0,
    misc: 0,
    medical: 0,
    conveyance: 0,
    education: 0,
    performanceBonus: 0,
    fixedCost: 0,
    recruitmentCost: 0,
    trainingCost: 0,
    salaryPerDay: 0,
    computerTimePerDay: 0,
  };

  constructor(
    private employeeService: EmployeeService,
    private payrollService: PayrollService,
  ) {
    this.tenant = JSON.parse(localStorage.getItem('tenant') || '{}');
    this.notyf = new Notyf();
    this.personalDetails = JSON.parse(localStorage.getItem('employeeId') || '{}');
    // Prefill surety from employee guarantor fields
    if (this.personalDetails?.guarantorName) {
      this.form.suretyName = this.personalDetails.guarantorName;
    }
    if (this.personalDetails?.guarantorRelation) {
      this.form.suretyRelation = this.personalDetails.guarantorRelation;
    } else if (!this.form.suretyRelation) {
      this.form.suretyRelation = 'elder sister';
    }
    if (this.personalDetails?.guarantorAge != null && this.personalDetails?.guarantorAge !== '') {
      this.form.suretyAge = this.personalDetails.guarantorAge;
    }
    if (this.personalDetails?.dateOfBirth) {
      this.personalDetails.age = this.calcAge(this.personalDetails.dateOfBirth);
    }
    this.loadData();
    this.loadSalaryFromPayroll();
  }

  get employeeName(): string {
    return `${this.personalDetails?.firstName || ''} ${this.personalDetails?.lastName || ''}`.trim();
  }

  get year(): number {
    const d = this.personalDetails?.joiningDate
      ? new Date(this.personalDetails.joiningDate)
      : new Date();
    return Number.isNaN(d.getTime()) ? new Date().getFullYear() : d.getFullYear();
  }

  /** Normalized gender from DB / localStorage */
  get genderKey(): string {
    return String(this.personalDetails?.gender || '').trim().toLowerCase();
  }

  getTitle(): string {
    return this.genderKey === 'male' ? 'Mr.' : 'Ms.';
  }

  getRelation(): string {
    return this.genderKey === 'male' ? ' S/O' : ' D/O';
  }

  /** Age from dateOfBirth (DB), fallback to stored age */
  get employeeAge(): number | string {
    const dob = this.personalDetails?.dateOfBirth;
    if (dob) {
      const age = this.calcAge(dob);
      if (age !== '____') return age;
    }
    if (this.personalDetails?.age != null && this.personalDetails.age !== '') {
      return this.personalDetails.age;
    }
    return '____';
  }

  get fatherName(): string {
    return this.personalDetails?.fatherName || '____________';
  }

  get designation(): string {
    return this.personalDetails?.designation || this.personalDetails?.Designation || this.personalDetails?.designation_name || 'Trainee – Software Engineer';
  }

  get companyAddress(): string {
    const addr = String(this.tenant?.companyAddress || '').trim();
    if (addr && /cyber\s*tower/i.test(addr)) return addr;
    return '7th Floor, Cyber Tower, Vibhuti Khand, Gomti Nagar, Lucknow, Uttar Pradesh 226010';
  }

  get employeeAddress(): string {
    return this.personalDetails?.permanentAddress || this.personalDetails?.address || '________________________________';
  }

  /** Surety / guarantor name from employee DB field */
  get guarantorName(): string {
    return (
      this.personalDetails?.guarantorName ||
      this.form.suretyName ||
      '____________________'
    );
  }

  get guarantorAge(): number | string {
    if (this.personalDetails?.guarantorAge != null && this.personalDetails.guarantorAge !== '') {
      return this.personalDetails.guarantorAge;
    }
    if (this.form.suretyAge != null && this.form.suretyAge !== '') {
      return this.form.suretyAge;
    }
    return '____';
  }

  get guarantorRelation(): string {
    return (
      this.personalDetails?.guarantorRelation ||
      this.form.suretyRelation ||
      '____________'
    );
  }

  get guarantorAddress(): string {
    return (
      this.personalDetails?.guarantorAddress ||
      this.employeeAddress ||
      '________________________________'
    );
  }

  calcAge(dob: string): number | string {
    if (!dob) return '____';
    let birthDate: Date;
    const raw = String(dob).trim();
    if (raw.includes('/')) {
      // DD/MM/YYYY
      const [dd, mm, yyyy] = raw.split('/');
      birthDate = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
    } else {
      birthDate = new Date(raw.includes('T') ? raw : `${raw}T00:00:00`);
    }
    if (Number.isNaN(birthDate.getTime())) return '____';
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return age >= 0 ? age : '____';
  }

  formatJoiningDate(dateStr: string): string {
    const parts = this.getJoiningDateParts(dateStr);
    if (!parts) return '____ of ____, ____';
    return `${parts.day}${parts.suffix} of ${parts.month}, ${parts.year}`;
  }

  /** Date with superscript ordinal, e.g. 7<sup>th</sup> of Apr, 2026 */
  formatJoiningDateHtml(dateStr: string): string {
    const parts = this.getJoiningDateParts(dateStr);
    if (!parts) return '____ of ____, ____';
    return `${parts.day}<sup class="ord-sup">${parts.suffix}</sup> of ${parts.month}, ${parts.year}`;
  }

  private getJoiningDateParts(dateStr: string): { day: number; suffix: string; month: string; year: number } | null {
    if (!dateStr) return null;
    const date = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T00:00:00`);
    if (Number.isNaN(date.getTime())) return null;
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec',
    ];
    const day = date.getDate();
    return {
      day,
      suffix: this.getDaySuffix(day),
      month: months[date.getMonth()],
      year: date.getFullYear(),
    };
  }

  getDaySuffix(day: number): string {
    if (day >= 11 && day <= 13) return 'th';
    switch (day % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  }

  loadData(): void {
    if (!this.personalDetails?.id) return;
    this.employeeService.getLetterData(this.personalDetails.id, 'service').subscribe({
      next: (res: any) => {
        if (res?.status && res.data) {
          // Keep salary + cost fields dynamic from payroll CTC
          const {
            ctc, basic, hra, misc, medical, conveyance, education,
            performanceBonus, salaryPerDay, computerTimePerDay,
            fixedCost, recruitmentCost, trainingCost,
            ...rest
          } = res.data;
          this.form = { ...this.form, ...rest };
        }
      },
      error: () => {}
    });
  }

  /** Fixed cost = monthly CTC; Recruitment = 40% of CTC; Training = 60% of CTC. */
  applyCostFromCtc(ctcAmount?: number): void {
    const ctc = Number(ctcAmount != null ? ctcAmount : this.form.ctc) || 0;
    if (!ctc) return;
    this.form.fixedCost = Math.round(ctc);
    this.form.recruitmentCost = Math.round(ctc * 0.4);
    this.form.trainingCost = Math.round(ctc * 0.6);
    this.form.salaryPerDay = Math.round(ctc / 30);
    this.form.computerTimePerDay = Math.round(this.form.salaryPerDay / 2);
  }

  onCtcChange(): void {
    this.applyCostFromCtc();
    this.saveData();
  }

  /** Load CTC + allowance breakup from employee salary setup (monthly). */
  loadSalaryFromPayroll(): void {
    if (!this.personalDetails?.id) return;

    this.payrollService.getSalarySetupList({
      employeeId: this.personalDetails.id,
      status: 'active',
      salaryBreakDown: 'monthly',
    }).subscribe({
      next: (response: any) => {
        if (!response?.status || !response?.data) return;

        const basics = response.data.basics || [];
        const allowances = response.data.allowances || [];

        const toMonthly = (item: any) =>
          Math.round(Number(item.finalAmount || item.calculated_amount || 0) / 12);

        this.salaryComponents = [
          ...basics.map((item: any) => ({
            name: item.component_name || item.name || 'Basic',
            amount: toMonthly(item),
          })),
          ...allowances.map((item: any) => ({
            name: item.component_name || item.name || 'Allowance',
            amount: toMonthly(item),
          })),
        ].filter((row) => Number(row.amount) > 0);

        const items = this.salaryComponents.map((c) => ({
          name: String(c.name || '').toLowerCase(),
          amount: c.amount,
        }));
        const pick = (...keys: string[]) => {
          const found = items.find((item) => keys.some((k) => item.name.includes(k)));
          return found ? Number(found.amount) || 0 : 0;
        };

        let ctc = Number(basics[0]?.finalCTC || 0);
        ctc = Math.round(ctc / 12);

        this.form.ctc = ctc || this.form.ctc;
        this.form.basic = pick('basic') || this.form.basic;
        this.form.hra = pick('hra', 'house rent') || this.form.hra;
        this.form.medical = pick('medical') || this.form.medical;
        this.form.conveyance = pick('conveyance', 'transport') || this.form.conveyance;
        this.form.education = pick('education', 'child') || this.form.education;
        this.form.performanceBonus =
          pick('performance', 'lta', 'bonus') || this.form.performanceBonus;
        this.form.misc =
          pick('misc', 'special allowance', 'special allow', 'special') || this.form.misc;

        if (this.form.ctc) {
          this.applyCostFromCtc(this.form.ctc);
        }
      },
      error: () => {}
    });
  }

  saveData(): void {
    if (!this.personalDetails?.id) return;
    this.employeeService.saveLetterData(this.personalDetails.id, 'service', { ...this.form }).subscribe({
      error: () => {}
    });
  }

  private readonly printStyles = `
    @page { size: A4; margin: 12mm 18mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0; padding: 0;
      font-family: 'Times New Roman', Times, serif;
      font-size: 10pt; line-height: 1.55; color: #000; background: #fff;
    }
    .document-wrapper { display: block; }
    .page {
      width: 100%; min-height: auto; height: auto; margin: 0; padding: 0;
      position: relative; page-break-after: always; break-after: page;
      page-break-inside: avoid; break-inside: avoid;
      font-family: 'Times New Roman', Times, serif; font-size: 10pt; line-height: 1.55;
    }
    .page:last-child { page-break-after: auto; break-after: auto; }
    .content { padding: 0; }
    .ord-sup {
      font-size: 0.65em;
      vertical-align: super;
      line-height: 0;
      font-weight: inherit;
    }
    .page--parties {
      font-size: 9.5pt; line-height: 1.32;
    }
    .page--parties .content { padding: 0 0 24px; }
    .page--parties h6 { margin: 14px 0 8px; font-size: 9.5pt; }
    .page--parties h6:first-child { margin-top: 0; }
    .page--parties p { margin: 6px 0 12px; font-size: 9.5pt; line-height: 1.38; text-align: justify; }
    .page--parties .def-item { margin: 8px 0 8px 8px; line-height: 1.32; }
    .page--parties .edit-field, .page--parties input.edit-field { font-size: 9.5pt; }
    .page--parties .signature { margin-top: 100px; }
    .page--terms, .page--terms .content { font-size: 10pt; line-height: 1.4; }
    .page--terms .content { padding-top: 28px; }
    .page--terms h6 { margin: 8px 0 6px; font-size: 10pt; }
    .page--terms p { margin: 6px 0; font-size: 10pt; line-height: 1.4; text-align: justify; }
    .page--terms .edit-field, .page--terms input.edit-field { font-size: 10pt; }
    .page--terms .salary-table {
      width: 85%; margin: 6px 0; font-size: 7.5pt;
    }
    .page--terms .salary-table th, .page--terms .salary-table td {
      font-size: 7.5pt; padding: 2px 4px; line-height: 1.25;
    }
    .page--terms .signature { font-size: 10pt; margin-top: 80px; }
    .page--terms .def-item { font-size: 10pt; line-height: 1.4; }
    .page--terms ol.terms, .page--terms ol.terms li { font-size: 10pt; line-height: 1.4; }
    .sa-letterhead-spacer { display: block; height: 150mm; min-height: 150mm; }
    .center { text-align: center; margin-bottom: 14px; font-weight: bold; }
    h3 { text-align: center; font-weight: bold; font-size: 9.5pt; margin: 0 0 14px 0; }
    h4, h6 { font-weight: bold; margin: 12px 0 8px; }
    p { margin: 8px 0; text-align: justify; }
    .meta-line { margin: 0; padding: 0; line-height: 1.25; text-align: left; font-weight: bold; }
    .meta-line .edit-field { font-weight: bold; }
    .salary-table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 10pt; }
    .salary-table th, .salary-table td { border: 1px solid #000; padding: 4px 6px; text-align: left; font-size: 10pt; }
    .signature {
      margin-top: 150px; display: flex; justify-content: space-between;
      font-weight: bold; position: relative; bottom: auto; left: auto; right: auto;
      page-break-inside: avoid; break-inside: avoid;
      page-break-before: avoid; break-before: avoid;
    }
    .signature > div {
      min-width: 120px; text-align: center; padding-top: 10px; border-top: 1px solid #000;
      page-break-inside: avoid; break-inside: avoid;
    }
    .edit-field, input.edit-field {
      border: none; border-bottom: 1px solid #999; outline: none;
      font-family: 'Times New Roman', Times, serif; font-size: 10pt;
      background: transparent; min-width: 60px; padding: 0 2px;
    }
    .def-item { margin: 6px 0 6px 12px; }
    ol.terms { padding-left: 22px; }
    ol.terms li { margin-bottom: 8px; text-align: justify; }
    .tick-row { margin: 6px 0; }
    .page--witness .content { padding-top: 36px; padding-bottom: 40px; font-size: 9.5pt; }
    .page--witness .witness-heading { margin: 0 0 18px; font-size: 10pt; text-align: left; font-weight: normal; }
    .witness-top {
      display: flex; justify-content: space-between; align-items: flex-start;
      gap: 40px; min-height: 300px;
    }
    .witness-left { flex: 1; }
    .witness-list { display: flex; flex-direction: column; gap: 48px; margin-top: 8px; }
    .witness-item { width: 180px; text-align: center; }
    .party-block { width: 180px; text-align: center; }
    .sig-space { height: 36px; }
    .witness-label {
      margin: 0; text-align: center; font-weight: normal; text-transform: uppercase;
    }
    .witness-top .party-label {
      margin: 0; text-align: center; font-weight: normal; text-transform: uppercase;
    }
    .party-label {
      margin: 0; text-align: center; font-weight: bold; text-transform: uppercase;
    }
    .witness-right {
          display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 48px;
    padding-top: 48px;
    min-width: 160px;
    }
    .witness-right .party-label { text-align: right; }
    .stamp-box {
      width: 72px; height: 72px; margin-left: auto; margin-bottom: 6px;
      border: 1.5px dashed #999; border-radius: 50%;
    }
    .stamp-box--lg { width: 90px; height: 90px; margin: 0 auto 8px; }
    .notary-block { margin-top: 48px; }
    .notary-note { margin: 6px 0 14px; text-align: left; font-size: 10pt; }
    .notary-row {
      display: flex; justify-content: space-between; align-items: center;
      margin: 10px 0; gap: 24px; text-align: left;
    }
    .notary-box { font-size: 14pt; line-height: 1; flex-shrink: 0; }
    .witness-footer {
      display: flex; justify-content: space-between; align-items: flex-end;
      margin-top: 56px; gap: 24px;
    }
    .footer-col { flex: 1; text-align: center; }
    .footer-col .party-label { text-align: center; margin-top: 6px; }
    .footer-col .sig-line {
      border-bottom: 1px solid #000; width: 85%; margin: 0 auto; height: 1px;
    }
    .footer-col .sig-space { height: 48px; }
  `;

  printDoc(): void {
    this.saveData();
    const element = document.getElementById('service-agreement-doc');
    if (!element) return;

    const cloned = element.cloneNode(true) as HTMLElement;
    cloned.querySelectorAll('input').forEach((input: any) => {
      const span = document.createElement('span');
      let value = input.value || '';
      if (input.type === 'date' && value) {
        const d = new Date(`${value}T00:00:00`);
        if (!Number.isNaN(d.getTime())) {
          const dd = String(d.getDate()).padStart(2, '0');
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          value = `${dd}/${mm}/${d.getFullYear()}`;
        }
      }
      span.textContent = value;
      input.parentNode?.replaceChild(span, input);
    });

    const content = `<!DOCTYPE html><html><head><title>Service Agreement</title>
      <style>${this.printStyles}</style>
    </head><body>${cloned.outerHTML}</body></html>`;

    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:0;';
    iframe.setAttribute('srcdoc', content);
    document.body.appendChild(iframe);

    iframe.onload = () => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => document.body.removeChild(iframe), 1000);
    };
  }
}
