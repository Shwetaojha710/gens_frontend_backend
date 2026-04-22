import { Component, OnInit, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import SignaturePad from 'signature_pad';
import { EmployeePortalService } from '../services/employee-portal.service';
import { Notyf } from 'notyf';

@Component({
  selector: 'app-employee-portal-documents',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './employee-portal-documents.component.html',
  styleUrl: './employee-portal-documents.component.css',
})
export class EmployeePortalDocumentsComponent implements OnInit, AfterViewChecked {
  loading = true;
  active = true;
  letters: any = { offer: null, appointment: null, relieving: null };
  emp: any = {};
  tenant: any = {};
  notyf = new Notyf();
  downloading: string | null = null;

  // ─── signature ────────────────────────────────────────────────────────────
  showSignPanel = false;
  sigPad: SignaturePad | null = null;
  savedSignature: string | null = null;
  savingSig = false;
  private sigPadInited = false;

  @ViewChild('sigCanvas') sigCanvasEl!: ElementRef<HTMLCanvasElement>;

  readonly docs = [
    { key: 'offer',       label: 'Offer Letter',      icon: 'ri-mail-open-line',   color: 'offer'       },
    { key: 'appointment', label: 'Appointment Letter', icon: 'ri-file-text-line',   color: 'appointment' },
    { key: 'relieving',   label: 'Relieving Letter',   icon: 'ri-file-list-3-line', color: 'relieving'   },
  ] as const;

  constructor(private portalService: EmployeePortalService) {}

  ngOnInit(): void {
    this.portalService.getEmpLetterDocs().subscribe({
      next: (res: any) => {
        this.loading = false;
        if (res?.data?.active === false) { this.active = false; return; }
        if (res?.data) {
          this.letters = res.data.letters || this.letters;
          this.emp     = res.data.emp     || {};
          this.tenant  = res.data.tenant  || {};
          this.savedSignature = this.letters.appointment?.data?.signature || null;
        }
      },
      error: () => { this.loading = false; this.notyf.error('Could not load documents.'); },
    });
  }

  ngAfterViewChecked(): void {
    if (this.showSignPanel && this.sigCanvasEl && !this.sigPadInited) {
      this.initSigPad();
    }
    if (!this.showSignPanel) {
      this.sigPadInited = false;
      this.sigPad = null;
    }
  }

  private initSigPad(): void {
    const canvas = this.sigCanvasEl.nativeElement;
    canvas.width  = canvas.offsetWidth  || 500;
    canvas.height = canvas.offsetHeight || 160;
    this.sigPad = new SignaturePad(canvas, { penColor: '#1e293b', backgroundColor: 'rgba(0,0,0,0)' });
    this.sigPadInited = true;
  }

  openSignPanel(): void { this.showSignPanel = true; }
  clearSig(): void { this.sigPad?.clear(); }

  saveSig(): void {
    if (!this.sigPad || this.sigPad.isEmpty()) {
      this.notyf.error('Please draw your signature first.');
      return;
    }
    const dataUrl = this.sigPad.toDataURL('image/png');
    this.savingSig = true;
    this.portalService.saveEmpLetterSignature(dataUrl).subscribe({
      next: (res: any) => {
        this.savingSig = false;
        if (res?.status) {
          this.savedSignature = dataUrl;
          if (this.letters.appointment?.data) {
            this.letters.appointment.data.signature = dataUrl;
          }
          this.showSignPanel = false;
          this.notyf.success('Signature saved successfully.');
        } else {
          this.notyf.error(res?.message || 'Could not save signature.');
        }
      },
      error: () => { this.savingSig = false; this.notyf.error('Could not save signature.'); },
    });
  }

  // ─── helpers ──────────────────────────────────────────────────────────────

  isGenerated(key: string): boolean { return !!this.letters[key]?.generated; }

  formattedDate(key: string): string {
    const iso = this.letters[key]?.updatedAt;
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  // ─── print ────────────────────────────────────────────────────────────────

  async printLetter(key: 'offer' | 'appointment' | 'relieving'): Promise<void> {
    if (!this.isGenerated(key)) return;
    this.downloading = key + '_print';
    try {
      const bgImage = key !== 'appointment'
        ? await this.getBase64FromSrc('/assets/img/Letterhead-2.png') : '';
      const html = this.buildLetterHtml(key, bgImage);
      const win = window.open('', '_blank', 'width=900,height=700');
      if (!win) { this.notyf.error('Pop-up blocked. Please allow pop-ups.'); return; }
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => win.print(), 600);
    } catch { this.notyf.error('Could not prepare document.'); }
    finally { this.downloading = null; }
  }

  // ─── download PDF ─────────────────────────────────────────────────────────

  async downloadLetter(key: 'offer' | 'appointment' | 'relieving'): Promise<void> {
    if (!this.isGenerated(key)) return;
    this.downloading = key + '_dl';
    try {
      const bgImage = key !== 'appointment'
        ? await this.getBase64FromSrc('/assets/img/Letterhead-2.png') : '';

      const pageStyle = `
        box-sizing:border-box;width:21cm;min-height:29.7cm;
        padding:100px 60px 60px;
        font-family:"Times New Roman",serif;font-size:12px;color:#000;
        ${bgImage ? `background-image:url('${bgImage}');background-size:100% 100%;background-repeat:no-repeat;` : ''}
      `;

      let bodyHtml = '';
      if (key === 'offer')       bodyHtml = this.offerBody();
      if (key === 'appointment') bodyHtml = this.appointmentBody();
      if (key === 'relieving')   bodyHtml = this.relievingBody();

      const el = document.createElement('div');
      el.setAttribute('style', 'position:fixed;top:-99999px;left:-99999px;' + pageStyle);
      el.innerHTML = bodyHtml;
      document.body.appendChild(el);

      const html2pdfMod = await import('html2pdf.js');
      const html2pdf = (html2pdfMod as any).default || html2pdfMod;

      await html2pdf().set({
        margin: 0,
        filename: `${key}_letter_${this.emp.firstName || 'employee'}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2, useCORS: true, allowTaint: true, logging: false,
          onclone: (clonedDoc: Document) => {
            Array.from(clonedDoc.querySelectorAll('link[rel="stylesheet"],style')).forEach(s => s.remove());
            const style = clonedDoc.createElement('style');
            style.textContent = `
              *{box-sizing:border-box;}body{margin:0;}
              table{width:100%;border-collapse:collapse;}
              th,td{border:1px solid #000;padding:4px 6px;}
              .no-border td{border:none;}
              ol{padding-left:20px;}li{margin-bottom:6px;font-size:12px;}
              sup{font-size:0.7em;vertical-align:super;}
            `;
            clonedDoc.head.appendChild(style);
          }
        } as any,
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      }).from(el).save();

      document.body.removeChild(el);
    } catch (e) {
      console.error(e);
      this.notyf.error('Could not generate PDF.');
    } finally { this.downloading = null; }
  }

  // ─── letter builders ──────────────────────────────────────────────────────

  private buildLetterHtml(key: string, bgImage: string): string {
    const pageStyle = bgImage
      ? `background-image:url('${bgImage}');background-size:100% 100%;background-repeat:no-repeat;` : '';
    let body = '';
    if (key === 'offer')       body = this.offerBody();
    if (key === 'appointment') body = this.appointmentBody();
    if (key === 'relieving')   body = this.relievingBody();
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${key} letter</title>
<style>
  *{box-sizing:border-box;}@page{margin:0;}
  body{margin:0;font-family:"Times New Roman",serif;font-size:12px;color:#000;}
  .page{width:21cm;min-height:29.7cm;padding:100px 60px 60px;${pageStyle}}
  table{width:100%;border-collapse:collapse;}
  th,td{border:1px solid #000;padding:4px 6px;}
  .no-border td{border:none;}
  ol{padding-left:20px;}li{margin-bottom:6px;font-size:12px;}
  sup{font-size:0.7em;vertical-align:super;}
  @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}@page{margin:0;size:A4;}}
</style></head><body><div class="page">${body}</div></body></html>`;
  }

  private offerBody(): string {
    const d = this.letters.offer?.data || {};
    const e = this.emp;
    const t = this.tenant;
    const parentPrefix = e.gender === 'Female' ? 'D/O' : 'S/O';
    return `
<table class="no-border" style="margin-top:20px;font-size:11px;">
  <tr>
    <td><b>Ref: Quaere/Emp/Offer/${d.refNo || ''}</b></td>
    <td style="text-align:right"><b>Dated: ${this.fmtOrdinal(d.offerDate)}</b></td>
  </tr>
</table>
<div style="margin:30px 0;line-height:1.8;font-size:11px;">
  <b>${e.firstName} ${e.lastName}</b><br>${parentPrefix} ${e.fatherName}<br>${e.permanentAddress || ''}
</div>
<p style="margin:20px 0;font-weight:bold;">Dear ${e.firstName},</p>
<div style="font-size:11px;line-height:1.6;">
  <p>With reference to your application and subsequent interview with us, we are pleased to offer you employment in our Company as <b>${e.designation}</b> in the <b>${e.department}</b> at our Head Office &ndash; ${t.companyAddress}, as per the mutually agreed terms and conditions discussed with you at the time of interview.</p>
  <p>You are requested to report for joining on or before <b>${this.fmtOrdinal(e.joiningDate)}</b>.</p>
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
    <td style="width:50%;text-align:right;vertical-align:top;"><p>Agreed &amp; Accepted</p><p style="margin-top:40px;"><b>${e.firstName} ${e.lastName}</b></p></td>
  </tr>
</table>`;
  }

  private appointmentBody(): string {
    const d = this.letters.appointment?.data || {};
    const e = this.emp;
    const t = this.tenant;
    const joiningDate = d.joiningDate || e.joiningDate || '';
    const fmtJoining = joiningDate
      ? new Date(joiningDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
    const designation = d.designation || e.designation || '';
    const refNo = d.ref_no || '';
    const salaryTable = d.salaryTable || null;
    const ctc = d.ctc || 0;
    const signature = d.signature || null;
    const fmt = (n: number) => Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });

    const sigHtml = signature
      ? `<div style="margin-top:8px;"><img src="${signature}" style="height:60px;border:1px solid #ccc;border-radius:4px;" alt="Employee Signature"/><br><small style="color:#555;">Digitally signed by ${e.firstName} ${e.lastName}</small></div>`
      : `<p style="font-size:12px;">(Signature of Employee)</p>`;

    const annexure = salaryTable ? `
<div style="page-break-before:always;"></div>
<h4 style="text-align:center;"><u>Annexure "A"</u></h4>
<p style="font-size:12px;"><b>Cost to Company Details</b></p>
<p style="font-size:12px;">In continuation to our appointment letter dated ${fmtJoining}, the breakup of your salary will be as follows:</p>
<h4 style="text-align:center;font-size:12px;"><u>Salary Annexure</u></h4>
<table>
  <tr><th style="font-size:12px;">Particulars</th><th style="font-size:12px;">Annual</th><th style="font-size:12px;">Monthly</th></tr>
  <tr><td style="font-size:12px;"><b>Gross Remuneration</b></td><td style="font-size:12px;">${fmt(salaryTable.totalEarning)}</td><td style="font-size:12px;">${fmt(salaryTable.totalEarning / 12)}</td></tr>
  ${(salaryTable.earnings || []).map((item: any) => `<tr><td style="font-size:12px;">${item.name || item.component_name || ''}</td><td style="font-size:12px;">${fmt(item.finalAmount)}</td><td style="font-size:12px;">${fmt(item.finalAmount / 12)}</td></tr>`).join('')}
  <tr><td style="font-size:12px;"><b>Parts of Benefits</b></td><td></td><td></td></tr>
  ${(salaryTable.deductions || []).map((item: any) => `<tr><td style="font-size:12px;">${item.component_name || item.name || ''}</td><td style="font-size:12px;">${fmt(item.finalAmount)}</td><td style="font-size:12px;">${fmt(item.finalAmount / 12)}</td></tr>`).join('')}
  <tr><td style="font-size:12px;"><b>In Hand Remuneration</b></td><td style="font-size:12px;">${fmt(salaryTable.netSalary)}</td><td style="font-size:12px;">${fmt(salaryTable.netSalary / 12)}</td></tr>
  <tr><td style="font-size:12px;"><b>Total Cost to the Company (Annual)</b></td><td style="font-size:12px;">${fmt(ctc)}</td><td style="font-size:12px;">${fmt(ctc / 12)}</td></tr>
  <tr><td colspan="3" style="font-size:12px;"><b>Annual Cost to Company (In Words) — ${this.numToWords(ctc)}</b></td></tr>
</table>
<p style="font-size:12px;">Kindly Note that you are required to make your own arrangements for stay at the place of posting. We wish you all the best and hope to have a long and fruitful association.</p>
<p style="font-size:12px;">Regards</p>
<p style="font-size:12px;">Authorized Signatory</p>
<p style="font-size:12px;">For ${t.companyName}</p>
<p style="text-align:center;font-size:12px;"><b>ACKNOWLEDGEMENT &amp; ACCEPTANCE</b></p>
<p style="font-size:12px;">DATE: __________</p>
<p style="text-align:right;font-size:12px;">(SIGNATURE OF CANDIDATE)</p>` : '';

    return `
<h3 style="text-align:center;">APPOINTMENT LETTER</h3>
<table class="no-border">
  <tr>
    <td style="vertical-align:top;">
      <p style="margin:0;font-weight:bold;">${e.firstName} ${e.lastName}</p>
      <p style="margin:0;font-weight:bold;">${e.gender === 'Female' ? 'D/O' : 'S/O'} ${e.fatherName}</p>
      <p style="margin:0;font-weight:bold;">${e.permanentAddress || ''}</p>
    </td>
    <td style="text-align:right;vertical-align:top;">
      <p style="margin:0;font-weight:bold;">Date: ${fmtJoining}</p>
      <p style="margin:0;font-weight:bold;">Ref No: ${refNo}</p>
    </td>
  </tr>
</table>
<br>
<p style="font-size:12px;">Dear ${e.firstName} ${e.lastName},</p><br>
<p style="font-size:12px;">The management takes great pride in informing you that you have been appointed as <b>${designation}</b> in our company presently posted at ${t.companyAddress}, w.e.f ${fmtJoining}. You will be required to sign our NDA, Service Agreement and Separation Policy.</p><br>
<p style="font-size:12px;">Your appointment shall be subject to the following terms and conditions:</p>
<ol class="terms">
  <li style="font-size:14px;">That your probation will be of three months that can be extended based on your performance and confirmation will be written no deemed confirmation shall be effective on your employment.</li>
  <li style="font-size:14px;">That before completion of probation either party can terminate the employment without notice.</li>
  <li style="font-size:14px;">Your resignation will become effective and final upon acceptance by the Management not withstanding that the communication of the acceptance of resignation has reached you or not. However, it will be the prerogative of the Management to accept or not your resignation. In case of any misconduct on your part, your services can be terminated with immediate effect without assigning any reason and without giving to you any notice or notice pay in lieu of notice or any other claim, compensation or damages.</li>
  <li style="font-size:14px;">Your employment with the Company may be terminated after giving a notice of minimum 90 days (depend upon the position in company) or salary in lieu thereof. You are bound to give 90 days notice before leaving the services of the Company. You will ensure that all your on-going activities/projects are successfully completed and handed over as per the Company guidelines on the separation process. Depending upon business requirements, the Company may or may not accept your request to shorten serving of the notice period against the payment of salary in lieu of such shortened notice period. If you fail to serve notice and your on-going activities are not successfully completed and handed over by you, the company may take legal action against you to recover the monetary or other losses.</li>
  <li style="font-size:14px;">That you will be paid monthly emoluments of Rs. ${fmt(ctc)}/- inclusive of Basic, and other allowances per month, subject to deduction of any statutory or other deductions (cost to company) as attached as Annexure "A".</li>
  <div style="page-break-before:always;"></div>
  <li style="font-size:14px;">That the bifurcation of your salary into various heads is at the sole discretion of the Management. The Management is further empowered to re-structure your salary at any time in future at its sole discretion.</li>
  <li style="font-size:14px;">That your increments will be based upon your all round performance in every six months, rather than once in a year and it based upon your professional efficiency, profitability of the establishment, your integrity, cost-effectiveness, discipline, punctuality, personal grooming, guest handling, staff handling etc. However, in case of your poor performance the increment can be withheld also at the sole discretion of the Management. Increments are neither automatic nor a right.</li>
  <li style="font-size:14px;">That you are liable to be transferred to any other location, establishment, outlet, unit, branch, subsidiary, associate, office, department, post or place etc.; situated anywhere in the country or otherwise; whether in existence presently or to be opened in future, wherever the Management has any interest. Upon such transfer you will be automatically governed by the service conditions, rules, regulations and other terms and conditions as applicable at such new place.</li>
  <li style="font-size:14px;">That you will be responsible for efficient and effective discharge of all functions in the establishment/ department, as the case may be, as required to be performed by your position, and as told to you by your superior or by the Management from time to time.</li>
  <li style="font-size:14px;">That since you are part of the Management Team, you will have no fixed duty hours or shifts, straight or broken, which will depend entirely upon the exigencies of business requirements, at the sole discretion of the Management. Your weekly off will also be liable to be staggered by the Management in the interest of business exigencies.</li>
  <li style="font-size:14px;">That you will directly and through your subordinates ensure proper and effective implementation and compliance of all relevant legal / statutory provisions.</li>
  <li style="font-size:14px;">That you will exercise overall responsibility of general management of the establishment/ department, as the case may be, or any other outlet / assignment assigned to you, and will run it with utmost efficiency as a successful profit center.</li>
  <li style="font-size:14px;">That if you will be authorized to act/sign documents/ appear before any court or authority on behalf of the Management. It is expected of you that you will do / commit / sign any documents strictly in the interest of the establishment and will not bind the Management by any illegal, unlawful and criminal liability, or anything unacceptable to the Management. In case you commit any breach of trust or privilege in such discharge of your duty, you will be personally liable for the consequences of your such acts and omissions.</li>
  <li style="font-size:14px;">That you will be accountable for maximizing the profitability and minimizing the costs, without compromising the standards / qualities / image of the establishment, and for always maintaining highest degree of standards in all areas of work / operation of the establishment / department, as the case may be.</li>
  <li style="font-size:14px;">That it will be your responsibility to draw check-list of all do's and don'ts of all departments / your department, as the case may be, and to ensure their strict daily compliance by all concerned.</li>
  <li style="font-size:14px;">That you will ensure that the policies of the Company are fully enforced and carried out in the letter and spirit by the subordinates working under your control. You will enforce, implement and maintain highest of discipline, decorum, motivation and cordial industrial relations amongst all staff working under you.</li>
  <li style="font-size:14px;">That you will define the duties and responsibilities of your subordinates and monitor them, and to carefully give them necessary authority to take decisions wherever necessary and called for, but ultimately you will be responsible for their actions, omissions, commissions etc.</li>
  <div style="page-break-before:always;"></div>
  <li style="font-size:14px;">That you will identify the training needs of employees working under your control, and will arrange to provide them effective training from time to time.</li>
  <li style="font-size:14px;">That you will devote whole time to the business of the Company and shall diligently and efficiently carry out the duties entrusted to you by the Company from time to time. You will not accept, directly or indirectly at any time and other job / assignment or transact business of any kind directly or indirectly, during your employment with the Company, whether full time or part time, and whether with or without any remuneration or consideration.</li>
  <li style="font-size:14px;">That the company shall have the right to recover from you or from your salary and other claims any loss or damage suffered by the company due to your negligent act or otherwise and you shall have no objection to the same.</li>
  <li style="font-size:14px;">That the Management shall, in its absolute discretion, have the right to terminate your services without any enquiry or notice or pay in lieu thereof in the event of your conviction by a court of Law for any offense involving moral turpitude either before joining or during the period of your employment under the Company.</li>
  <li style="font-size:14px;">That should you remain absent from your work, without any information or prior written sanction of leave, and / or without any satisfactory explanation for more than 8 consecutive days, including absence when leave though applied for but not granted, or overstaying your sanctioned leave for more than 8 consecutive days without written sanction of extension of leave by the Management; it will be presumed that you are no longer working for the Company and that you have abandoned service of your service of your own accord, thereby terminating yourself from your employment. In such a case, you will not be liable to receive any statutory compensation.</li>
  <li style="font-size:14px;">That you will be required to take prior written permission from the Management for seeking admission / pursuing any educational course / higher education / professional studies, with any educational / professional institute. Such permission, when granted, shall always be subject to the condition that it does not in any way adversely affect the work of the establishment. In case the permission for study is granted, you may be sanctioned leave for actual days of examination only. However, in the exigencies of business the permission so granted or leave so sanctioned is liable to be withdrawn / cancelled.</li>
  <li style="font-size:14px;">That it is understood by you that this employment is being offered to you on the basis of the particulars / credentials furnished by you in / with your application for employment. If, at any time, should it emerge that the particulars / credentials as furnished by you are false / incorrect, or if any material information has been suppressed, this appointment shall automatically be rendered void and shall be liable to termination forthwith without any notice or compensation.</li>
  <li style="font-size:14px;">That you are required to submit with the HR Department / Office, documentary proof of your date of birth and self-certified copies of other credentials about your qualifications, experience etc. The date of birth once declared / document produced shall not be allowed to be changed at your request any time in future.</li>
  <li style="font-size:14px;">That your appointment / continuation in appointment in the Company shall be subject to your medical fitness, physically and mentally, by a doctor nominated by the Management. You will also be required to periodical medical checkup and inoculations etc. as and when directed by the Management.</li>
  <div style="page-break-before:always;"></div>
  <li style="font-size:14px;">That you will keep the Management informed of your permanent / present communication / residential addresses, and contact telephone / mobile numbers. You must communicate any change in them to the Management in writing within three days of such change. Any communication sent to you at your last known address shall be considered to have been served on you.</li>
  <li style="font-size:14px;">That you will not refuse to accept any communication of the Management. It will amount to an act of misconduct on your part. That Management may send such refused communication at your residence under certificate of posting, and it will be deemed to have been personally served on you.</li>
  <li style="font-size:14px;">That you will be entitled to leave and holidays as per law / rules of the Company.</li>
  <li style="font-size:14px;">You must have to discuss your reporting person before giving your resignation letter.</li>
  <li style="font-size:14px;">That you will be governed by the rules, regulations, service conditions, employee hand-book, notices, circulars, instructions etc. as are in force at present and as may be amended / formulated / invoked / introduced by the Management from time to time. That any or all the terms and conditions of your employment are subject to revision at any time at the sole discretion of the Management. That you will retire on attaining the age of 58 years.</li>
  <li style="font-size:14px;">That in case any dispute or difference arises in respect of the interpretation of your terms and conditions of service, or about any act or omission on your part; the decision of the Managing Director or of any person nominated by him in that matter shall be final and binding on you.</li>
  <p style="font-size:12px;">In case the terms and conditions as mentioned above are acceptable to you, please sign on each page of the duplicate copy of this letter in token of your acceptance of them.</p>
</ol>
<p style="font-size:12px;">We welcome you to the Quaere family and wish you good luck.</p>
<p style="font-size:12px;">Sincerely,</p><br>
<p style="font-size:12px;"><b>Auth Signatory</b></p>
<p style="font-size:12px;">${t.companyName}</p>
<br>
<p style="font-size:12px;"><b>Acceptance:</b></p>
<p style="font-size:12px;">I, <b>${e.firstName} ${e.lastName}</b>, have carefully read and understood the terms and conditions of my appointment as mentioned herein above, and I agree and undertake to abide by them.</p>
<br><br>
${sigHtml}
${annexure}`;
  }

  private relievingBody(): string {
    const d = this.letters.relieving?.data || {};
    const e = this.emp;
    const parentPrefix = e.gender === 'Female' ? 'D/O' : 'S/O';
    const salutation = e.gender === 'Female' ? 'Ms.' : 'Mr.';
    return `
<table class="no-border" style="margin-bottom:20px;">
  <tr>
    <td><b>Ref: Quaere/Emp/Relieving/${d.refNo || ''}</b></td>
    <td style="text-align:right"><b>Dated: ${this.fmtOrdinal(d.relievingDate)}</b></td>
  </tr>
</table>
<div style="margin:20px 0;line-height:1.8;">
  ${e.firstName} ${e.lastName}<br>${parentPrefix} <b>${e.fatherName}</b><br>${e.permanentAddress || ''}
</div>
<div style="margin:30px 0 20px;">Subject: <b><u>Relieving Cum Experience Letter</u></b></div>
<div style="margin:20px 0;font-weight:bold;">Dear ${salutation} ${e.firstName} ${e.lastName},</div>
<p>You are hereby relieved from the services of the company by the closing hours of ${this.fmtOrdinal(d.relievingDate)}.</p>
<p>We wish to place on record that you had been under the employment from ${this.fmtOrdinal(d.joiningDate || e.joiningDate)} to ${this.fmtOrdinal(d.relievingDate)} with the current position as ${e.designation || '_______________'}.</p>
<p>All the dues will be paid to you as Full &amp; Final Settlement.</p>
<p>We thank you for your contribution to the Company and wish you all success in your future endeavors.</p>
<div style="margin-top:60px;">With warm regards,<br><br><br><b>Human Resource Department</b><br>Date: ${this.fmtOrdinal(new Date().toISOString())}</div>`;
  }

  // ─── utilities ────────────────────────────────────────────────────────────

  private fmtOrdinal(dateStr: string): string {
    if (!dateStr) return '___';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = d.getDate();
    const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const suf = (n: number) => n >= 11 && n <= 13 ? 'th' : n % 10 === 1 ? 'st' : n % 10 === 2 ? 'nd' : n % 10 === 3 ? 'rd' : 'th';
    return `${day}<sup>${suf(day)}</sup> ${months[d.getMonth()]}, ${d.getFullYear()}`;
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
