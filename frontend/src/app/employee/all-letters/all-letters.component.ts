import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Notyf } from 'notyf';
import { firstValueFrom } from 'rxjs';
import { EmployeeService } from '../../services/employee.service';
import { SearchPaginationComponent } from '../../master/search-pagination/search-pagination.component';

type LetterKey = 'appointment' | 'offer' | 'nda' | 'relieving';

@Component({
  selector: 'app-all-letters',
  standalone: true,
  imports: [CommonModule, FormsModule, SearchPaginationComponent],
  templateUrl: './all-letters.component.html',
  styleUrl: './all-letters.component.css',
})
export class AllLettersComponent implements OnInit {
  allEmployees: any[] = [];
  employees: any[] = [];
  filteredEmployees: any[] = [];
  pagedEmployees: any[] = [];

  loading = false;
  downloading: string | null = null;

  currentPage = 1;
  pageSize = 10;
  searchTerm = '';
  filterType = 'all';

  counts: any = { appointment: 0, nda: 0, relieving: 0, offer: 0 };
  employeeMap: any = {};

  notyf = new Notyf();

  readonly letterTypes = [
    { key: 'appointment', label: 'Appointment Letter', route: 'appointment-letter', color: 'appointment' },
    { key: 'offer',       label: 'Offer Letter',       route: 'offer-letter',       color: 'offer'       },
    { key: 'nda',         label: 'NDA',                route: 'nda',                color: 'nda'         },
    { key: 'relieving',   label: 'Relieving Letter',   route: 'releving-letter',    color: 'relieving'   },
  ];

  constructor(private employeeService: EmployeeService, private router: Router) {}

  ngOnInit(): void {
    this.loadEmployees();
    this.loadStats();
  }

  loadStats(): void {
    this.employeeService.getLetterStats().subscribe({
      next: (res: any) => {
        if (res.status && res.data) {
          this.counts     = res.data.counts     || { appointment: 0, nda: 0, relieving: 0, offer: 0 };
          this.employeeMap = res.data.employeeMap || {};
          this.buildFilteredList();
        }
      },
      error: () => {}
    });
  }

  loadEmployees(): void {
    this.loading = true;
    this.employeeService.getEmp().subscribe({
      next: (res: any) => {
        this.loading = false;
        if (res?.status === true) {
          this.allEmployees = res.data?.formattedActiveEmps || res.data?.formattedEmps || [];
          this.buildFilteredList();
        }
      },
      error: () => { this.loading = false; }
    });
  }

  buildFilteredList(): void {
    // Only employees who have at least 1 letter generated
    this.employees = this.allEmployees.filter(e => !!this.employeeMap[e.id]);
    this.applyFilter();
  }

  applyFilter(): void {
    const q = this.searchTerm.toLowerCase().trim();
    let list = this.employees;

    if (this.filterType !== 'all') {
      list = list.filter(e => !!this.employeeMap[e.id]?.[this.filterType]);
    }

    this.filteredEmployees = q
      ? list.filter(e =>
          `${e.firstName} ${e.lastName} ${e.empCode} ${e.designation_name} ${e.department_name}`
            .toLowerCase().includes(q))
      : [...list];

    this.currentPage = 1;
    this.updatePage();
  }

  updatePage(): void {
    const start = (this.currentPage - 1) * this.pageSize;
    this.pagedEmployees = this.filteredEmployees.slice(start, start + this.pageSize);
  }

  onSearch(term: string): void { this.searchTerm = term; this.applyFilter(); }
  onPageChange(p: number): void { this.currentPage = p; this.updatePage(); }
  onPageSizeChange(s: number): void { this.pageSize = s; this.currentPage = 1; this.updatePage(); }

  isGenerated(employeeId: string, type: string): boolean {
    return !!this.employeeMap[employeeId]?.[type];
  }

  generatedDate(employeeId: string, type: string): string {
    const iso = this.employeeMap[employeeId]?.[type];
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  generatedCount(emp: any): number {
    return this.letterTypes.filter(t => this.isGenerated(emp.id, t.key)).length;
  }

  openLetter(emp: any, route: string): void {
    localStorage.setItem('employeeId', JSON.stringify(emp));
    this.router.navigate([`/layout/employee/add/profile/professional-info/${route}`]);
  }

  async printLetter(emp: any, type: LetterKey): Promise<void> {
    if (!this.isGenerated(emp.id, type)) return;

    this.downloading = `${emp.id}_${type}`;
    try {
      const res: any = await firstValueFrom(this.employeeService.getLetterData(emp.id, type));
      const data = res?.data || {};
      const tenant = JSON.parse(localStorage.getItem('tenant') || '{}');
      const bgImage = type === 'offer' || type === 'relieving'
        ? await this.getBase64FromSrc('/assets/img/Letterhead-2.png')
        : '';
      const html = this.buildLetterHtml(type, emp, data, tenant, bgImage);
      const win = window.open('', '_blank', 'width=900,height=700');
      if (!win) {
        this.notyf.error('Pop-up blocked. Please allow pop-ups.');
        return;
      }
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => win.print(), 600);
    } catch (error) {
      console.error(error);
      this.notyf.error('Could not prepare letter.');
    } finally {
      this.downloading = null;
    }
  }

  get totalGenerated(): number { return this.employees.length; }

  private buildLetterHtml(type: LetterKey, emp: any, data: any, tenant: any, bgImage: string): string {
    const pageStyle = bgImage
      ? `background-image:url('${bgImage}');background-size:100% 100%;background-repeat:no-repeat;`
      : '';
    let body = '';
    if (type === 'offer') body = this.offerBody(emp, data, tenant);
    if (type === 'appointment') body = this.appointmentBody(emp, data, tenant);
    if (type === 'nda') body = this.ndaBody(emp, data, tenant);
    if (type === 'relieving') body = this.relievingBody(emp, data);

    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${type} letter</title>
<style>
  *{box-sizing:border-box;}
  @page{margin:0;size:A4;}
  body{margin:0;font-family:"Times New Roman",serif;font-size:12px;color:#000;background:#fff;}
  .page{width:21cm;min-height:29.7cm;padding:100px 60px 60px;${pageStyle}}
  .page--plain{padding:15mm 20mm;}
  table{width:100%;border-collapse:collapse;}
  th,td{border:1px solid #000;padding:4px 6px;}
  .no-border td{border:none;}
  ol,ul{padding-left:20px;}
  li{margin-bottom:6px;font-size:12px;}
  p{margin:8px 0;}
  sup{font-size:0.7em;vertical-align:super;}
  @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}
</style></head><body><div class="page ${type === 'appointment' || type === 'nda' ? 'page--plain' : ''}">${body}</div></body></html>`;
  }

  private offerBody(emp: any, data: any, tenant: any): string {
    const parentPrefix = this.genderOf(emp) === 'female' ? 'D/O' : 'S/O';
    const name = this.employeeName(emp);
    return `
<table class="no-border" style="margin-top:20px;font-size:11px;">
  <tr>
    <td><b>Ref: Quaere/Emp/Offer/${data.refNo || ''}</b></td>
    <td style="text-align:right"><b>Dated: ${this.fmtOrdinal(data.offerDate)}</b></td>
  </tr>
</table>
<div style="margin:30px 0;line-height:1.8;font-size:11px;">
  <b>${name}</b><br>${parentPrefix} ${emp.fatherName || ''}<br>${emp.permanentAddress || emp.address || ''}
</div>
<p style="margin:20px 0;font-weight:bold;">Dear ${emp.firstName || ''},</p>
<div style="font-size:11px;line-height:1.6;">
  <p>With reference to your application and subsequent interview with us, we are pleased to offer you employment in our Company as <b>${this.designationOf(emp)}</b> in the <b>${this.departmentOf(emp)}</b> at our Head Office - ${tenant.companyAddress || ''}, as per the mutually agreed terms and conditions discussed with you at the time of interview.</p>
  <p>You are requested to report for joining on or before <b>${this.fmtOrdinal(emp.joiningDate || emp.doj)}</b>.</p>
  <p>You are advised to submit the following documents at the time of joining:</p>
  <ol>
    <li>Three Latest passport size color photographs.</li>
    <li>Self-attested copy of address proof &amp; ID proof.</li>
    <li>One set of all credentials (mark sheet of 10<sup>th</sup> &amp; 12<sup>th</sup> and pass certificate with Degree/Diploma).</li>
    <li>Salary proof from previous Company.</li>
    <li>Relieving Letter/ No dues/ Clearance Certificate from all previous employers.</li>
    <li>Two references of immediate reporting person (one of current employer &amp; one of previous employer).</li>
  </ol>
  <p>This offer would automatically stand revoked in the event of not reporting at the date specified above and / or you not complying with any other terms &amp; conditions of employment or in case of a negative reference check received. At the time of joining, the formal appointment letter, containing detailed terms &amp; conditions, will be issued to you.</p>
  <p>We take this opportunity to welcome you to our Company and look forward to a long and mutually beneficial association with you.</p>
  <p>Please confirm your acceptance of this offer by signing and returning a copy of this letter to us.</p>
</div>
<table class="no-border" style="margin-top:40px;font-size:11px;">
  <tr>
    <td style="width:50%;vertical-align:top;"><p>Thanks &amp; Regards</p><br><br><p><b>Human Resource Dept</b></p></td>
    <td style="width:50%;text-align:right;vertical-align:top;"><p>Agreed &amp; Accepted</p><p style="margin-top:40px;"><b>${name}</b></p></td>
  </tr>
</table>`;
  }

  private appointmentBody(emp: any, data: any, tenant: any): string {
    const joiningDate = data.joiningDate || emp.joiningDate || emp.doj || '';
    const fmtJoining = this.fmtShort(joiningDate);
    const designation = data.designation || this.designationOf(emp);
    const salaryTable = data.salaryTable || null;
    const ctc = Number(data.ctc || 0);
    const name = this.employeeName(emp);
    const fmt = (n: number) => Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
    const annexure = salaryTable ? `
<div style="page-break-before:always;"></div>
<h4 style="text-align:center;"><u>Annexure "A"</u></h4>
<p><b>Cost to Company Details</b></p>
<p>In continuation to our appointment letter dated ${fmtJoining}, the breakup of your salary will be as follows:</p>
<h4 style="text-align:center;font-size:12px;"><u>Salary Annexure</u></h4>
<table>
  <tr><th>Particulars</th><th>Annual</th><th>Monthly</th></tr>
  <tr><td><b>Gross Remuneration</b></td><td>${fmt(salaryTable.totalEarning)}</td><td>${fmt(salaryTable.totalEarning / 12)}</td></tr>
  ${(salaryTable.earnings || []).map((item: any) => `<tr><td>${item.name || item.component_name || ''}</td><td>${fmt(item.finalAmount)}</td><td>${fmt(item.finalAmount / 12)}</td></tr>`).join('')}
  <tr><td><b>Parts of Benefits</b></td><td></td><td></td></tr>
  ${(salaryTable.deductions || []).map((item: any) => `<tr><td>${item.component_name || item.name || ''}</td><td>${fmt(item.finalAmount)}</td><td>${fmt(item.finalAmount / 12)}</td></tr>`).join('')}
  <tr><td><b>In Hand Remuneration</b></td><td>${fmt(salaryTable.netSalary)}</td><td>${fmt(salaryTable.netSalary / 12)}</td></tr>
  <tr><td><b>Total Cost to the Company (Annual)</b></td><td>${fmt(ctc)}</td><td>${fmt(ctc / 12)}</td></tr>
  <tr><td colspan="3"><b>Annual Cost to Company (In Words) - ${this.numToWords(ctc)}</b></td></tr>
</table>
<p>Regards</p><p>Authorized Signatory</p><p>For ${tenant.companyName || ''}</p>` : '';

    return `
<h3 style="text-align:center;text-decoration:underline;">APPOINTMENT LETTER</h3>
<table class="no-border">
  <tr>
    <td style="vertical-align:top;">
      <p style="margin:0;font-weight:bold;">${name}</p>
      <p style="margin:0;font-weight:bold;">${this.genderOf(emp) === 'female' ? 'D/O' : 'S/O'} ${emp.fatherName || ''}</p>
      <p style="margin:0;font-weight:bold;">${emp.permanentAddress || emp.address || ''}</p>
    </td>
    <td style="text-align:right;vertical-align:top;">
      <p style="margin:0;font-weight:bold;">Date: ${fmtJoining}</p>
      <p style="margin:0;font-weight:bold;">Ref No: ${data.ref_no || ''}</p>
    </td>
  </tr>
</table>
<p>Dear ${name},</p>
<p>The management takes great pride in informing you that you have been appointed as <b>${designation}</b> in our company presently posted at ${tenant.companyAddress || ''}, w.e.f ${fmtJoining}. You will be required to sign our NDA, Service Agreement and Separation Policy.</p>
<p>Your appointment shall be subject to the following terms and conditions:</p>
<ol>
  <li>That your probation will be of three months that can be extended based on your performance and confirmation will be written no deemed confirmation shall be effective on your employment.</li>
  <li>That before completion of probation either party can terminate the employment without notice.</li>
  <li>Your resignation will become effective and final upon acceptance by the Management. In case of any misconduct on your part, your services can be terminated with immediate effect.</li>
  <li>Your employment with the Company may be terminated after giving a notice of minimum 90 days or salary in lieu thereof.</li>
  <li>That you will be paid monthly emoluments of Rs. ${fmt(ctc)}/- inclusive of Basic, and other allowances per month, subject to deduction of any statutory or other deductions as attached as Annexure "A".</li>
  <li>That you are liable to be transferred to any other location, establishment, outlet, unit, branch, subsidiary, associate, office, department, post or place etc.</li>
  <li>That you will devote whole time to the business of the Company and shall diligently and efficiently carry out the duties entrusted to you by the Company from time to time.</li>
  <li>That you will be governed by the rules, regulations, service conditions, employee hand-book, notices, circulars and instructions as are in force at present and as may be amended from time to time.</li>
</ol>
<p>In case the terms and conditions as mentioned above are acceptable to you, please sign on each page of the duplicate copy of this letter in token of your acceptance of them.</p>
<p>We welcome you to the Quaere family and wish you good luck.</p>
<p>Sincerely,</p><br>
<p><b>Auth Signatory</b></p>
<p>${tenant.companyName || ''}</p>
<br>
<p><b>Acceptance:</b></p>
<p>I, <b>${name}</b>, have carefully read and understood the terms and conditions of my appointment as mentioned herein above, and I agree and undertake to abide by them.</p>
<br><br>
<p>(Signature of Employee)</p>
${annexure}`;
  }

  private ndaBody(emp: any, data: any, tenant: any): string {
    const name = this.employeeName(emp);
    return `
<h3 style="text-align:center;text-decoration:underline;">Employee/Intern/Contractor IP Rights, Confidentiality, Non-Solicitation, Non-Competition Agreement</h3>
<p>I <b>${name}</b> ${this.genderOf(emp) === 'female' ? 'D/O' : 'S/O'} <b>${emp.fatherName || ''}</b> residing at <b>${emp.permanentAddress || emp.address || ''}</b> do hereby agree with <b>${tenant.companyName || ''}</b> having its principal office at <b>${tenant.companyAddress || ''}</b>.</p>
<p>INDIA and all of its associate companies to abide by the following in consideration of the compensation paid to me by the Company for services, in any capacity, as an Employee, Associate, Intern, Part time Employee or a Contractor.</p>
<ol>
  <li>The Company shall be entitled to sole ownership of any intellectual property rights created, developed and discovered by me while in the course of my employment with the Company.</li>
  <li>I agree that I shall promptly disclose all software programs, inventions, improvements, discoveries and technical developments made, created or conceived by me during the term of my employment.</li>
  <li>I hereby assign to the Company my entire right, title and interest in and to such Inventions and documents, which relate in any way to or are useful in the Company's business.</li>
  <li>I shall maintain strict confidentiality and shall not disclose any technical, business, financial or commercial information of the Company.</li>
  <li>I shall not take out of the Company's premises any technical plans, charts, drawings, software codes, design and other materials containing confidential data without prior written consent.</li>
  <li>During and after my term with the Company, I shall at all times practice good discretion in the use or disclosure of any company documents or confidential information.</li>
  <li>Failure to comply with this agreement shall be construed as Gross Misconduct and may be deemed a ground for punishment, termination or legal action.</li>
</ol>
<br>
<p><b>Date:</b> ${this.fmtShort(data.date)}</p>
<p><b>Place:</b> ${data.place || ''}</p>
<table class="no-border" style="margin-top:40px;">
  <tr>
    <td style="width:50%;text-align:left;"><p>________________________</p><p><b>Shiv Pal Singh</b></p><p>Senior Vice President</p></td>
    <td style="width:50%;text-align:right;"><p>________________________</p><p><b>Signature</b></p><p>(Employee)</p><p>For ${name}</p><p>Designation ${this.designationOf(emp)}</p></td>
  </tr>
</table>`;
  }

  private relievingBody(emp: any, data: any): string {
    const name = this.employeeName(emp);
    const parentPrefix = this.genderOf(emp) === 'female' ? 'D/O' : 'S/O';
    const salutation = this.genderOf(emp) === 'female' ? 'Ms.' : 'Mr.';
    return `
<table class="no-border" style="margin-bottom:20px;">
  <tr>
    <td><b>Ref: Quaere/Emp/Relieving/${data.refNo || ''}</b></td>
    <td style="text-align:right"><b>Dated: ${this.fmtOrdinal(data.relievingDate)}</b></td>
  </tr>
</table>
<div style="margin:20px 0;line-height:1.8;">
  ${name}<br>${parentPrefix} <b>${emp.fatherName || ''}</b><br>${emp.permanentAddress || emp.address || ''}
</div>
<div style="margin:30px 0 20px;">Subject: <b><u>Relieving Cum Experience Letter</u></b></div>
<div style="margin:20px 0;font-weight:bold;">Dear ${salutation} ${name},</div>
<p>You are hereby relieved from the services of the company by the closing hours of ${this.fmtOrdinal(data.relievingDate)}.</p>
<p>We wish to place on record that you had been under the employment from ${this.fmtOrdinal(data.joiningDate || emp.joiningDate || emp.doj)} to ${this.fmtOrdinal(data.relievingDate)} with the current position as ${this.designationOf(emp) || '_______________'}.</p>
<p>All the dues will be paid to you as Full &amp; Final Settlement.</p>
<p>We thank you for your contribution to the Company and wish you all success in your future endeavors.</p>
<div style="margin-top:60px;">With warm regards,<br><br><br><b>Human Resource Department</b><br>Date: ${this.fmtOrdinal(new Date().toISOString())}</div>`;
  }

  private employeeName(emp: any): string {
    return `${emp.firstName || ''} ${emp.lastName || ''}`.trim();
  }

  private designationOf(emp: any): string {
    return emp.designation || emp.designation_name || emp.Designation || '';
  }

  private departmentOf(emp: any): string {
    return emp.department || emp.department_name || '';
  }

  private genderOf(emp: any): string {
    return String(emp.gender || '').toLowerCase();
  }

  private fmtShort(dateStr: string): string {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  private fmtOrdinal(dateStr: string): string {
    if (!dateStr) return '___';
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    const day = d.getDate();
    const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const suffix = (n: number) => n >= 11 && n <= 13 ? 'th' : n % 10 === 1 ? 'st' : n % 10 === 2 ? 'nd' : n % 10 === 3 ? 'rd' : 'th';
    return `${day}<sup>${suffix(day)}</sup> ${months[d.getMonth()]}, ${d.getFullYear()}`;
  }

  private numToWords(amount: number): string {
    if (!amount) return 'zero';
    const a = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
    const b = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
    const n2w = (n: number): string => {
      if (n < 20) return a[n];
      if (n < 100) return b[Math.floor(n / 10)] + (n % 10 ? ' ' + a[n % 10] : '');
      if (n < 1000) return a[Math.floor(n / 100)] + ' hundred' + (n % 100 ? ' and ' + n2w(n % 100) : '');
      if (n < 100000) return n2w(Math.floor(n / 1000)) + ' thousand' + (n % 1000 ? ' ' + n2w(n % 1000) : '');
      if (n < 10000000) return n2w(Math.floor(n / 100000)) + ' lakh' + (n % 100000 ? ' ' + n2w(n % 100000) : '');
      return n2w(Math.floor(n / 10000000)) + ' crore' + (n % 10000000 ? ' ' + n2w(n % 10000000) : '');
    };
    return n2w(Math.floor(amount));
  }

  private getBase64FromSrc(src: string): Promise<string> {
    return fetch(src).then(r => r.blob()).then(blob => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    }));
  }
}
