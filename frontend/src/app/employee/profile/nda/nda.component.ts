import { Component, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import SignaturePad from 'signature_pad';
import html2pdf from 'html2pdf.js';
import { Notyf } from 'notyf';
import { FormsModule } from "@angular/forms";
import { CommonModule, DatePipe } from '@angular/common';
import { EmployeeService } from '../../../services/employee.service';
import { MasterService } from '../../../services/master.service';
@Component({
  selector: 'app-nda',
  imports: [FormsModule,CommonModule],
  templateUrl: './nda.component.html',
  styleUrl: './nda.component.css'
})
export class NdaComponent {
  @ViewChild('signatureCanvas') canvas!: ElementRef;
  signaturePad!: SignaturePad;
  personalDetails:any={}
  tenant:any={}
   notyf: Notyf;
 constructor(private employeeService: EmployeeService, private masterService: MasterService) {
 
    this.personalDetails = JSON.parse(localStorage.getItem('employeeId') || '{}');
    this.tenant = JSON.parse(localStorage.getItem('tenant') || '{}');
    this.notyf = new Notyf();
    this.ensureDesignation();
    this.loadCompanyProfile();
    this.loadData();
  }

  /** Load company name/address from tenants table via API. */
  private loadCompanyProfile(): void {
    this.masterService.getCompanyProfile().subscribe({
      next: (res: any) => {
        if (!res?.status || !res?.data) return;
        this.tenant = {
          ...this.tenant,
          companyName: res.data.companyName || this.tenant?.companyName,
          companyAddress: res.data.companyAddress || this.tenant?.companyAddress,
        };
      },
      error: () => {},
    });
  }
 
  /** Employee designation for signature block. */
  get designation(): string {
    return (
      this.personalDetails?.designation ||
      this.personalDetails?.Designation ||
      this.personalDetails?.designation_name ||
      this.personalDetails?.designationName ||
      ''
    );
  }
 
  private ensureDesignation(): void {
    if (String(this.personalDetails?.designation || '').trim()) return;
 
    const fromProfile =
      this.personalDetails?.designation_name ||
      this.personalDetails?.Designation ||
      this.personalDetails?.designationName ||
      '';
 
    if (fromProfile) {
      this.personalDetails.designation = String(fromProfile).trim();
      return;
    }
 
    const designationId = this.personalDetails?.designationId;
    const departmentId = this.personalDetails?.departmentId;
    if (!designationId || !departmentId) return;
 
    this.masterService
      .designationDD({ department: departmentId?.value || departmentId })
      .subscribe({
        next: (response: any) => {
          if (String(this.personalDetails?.designation || '').trim()) return;
          if (response?.status !== true || !Array.isArray(response.data)) return;
          const match = response.data.find(
            (d: any) => String(d.value) === String(designationId),
          );
          if (match?.label) {
            this.personalDetails.designation = match.label;
          }
        },
        error: () => {},
      });
  }
 
  loadData(): void {
    this.employeeService.getLetterData(this.personalDetails.id, 'nda').subscribe({
      next: (res: any) => {
        if (res.status && res.data) {
          if (res.data.date) this.personalDetails.date = res.data.date;
          if (res.data.place) this.personalDetails.place = res.data.place;
          if (res.data.designation) {
            this.personalDetails.designation = res.data.designation;
          } else {
            this.ensureDesignation();
          }
        } else {
          this.ensureDesignation();
        }
      },
      error: () => {
        this.ensureDesignation();
      }
    });
  }
 
  saveData(): void {
    this.employeeService.saveLetterData(this.personalDetails.id, 'nda', {
      date: this.personalDetails.date,
      place: this.personalDetails.place,
      designation: this.designation,
    }).subscribe({ error: () => {} });
  }
  isEdit = false;
 
  documentName = "NDA Agreement";
  getTitle(): string {
    return String(this.personalDetails?.gender || '').trim().toLowerCase() === 'male' ? 'Mr.' : 'Ms.';
  }

  /** Company registered / principal office address from tenant. */
  get companyAddress(): string {
    return (
      this.tenant?.companyAddress ||
      this.tenant?.address ||
      this.tenant?.registeredAddress ||
      ''
    );
  }
  data = {
    name: 'Bharti Verma',
    fatherName: 'Ashok Kumar',
    address: 'Barabanki, UP',
    companyName: 'Quaere Etechnologies Pvt Ltd',
    companyAddress: 'Lucknow',
    date: '04 Aug 2024',
    place: 'Lucknow'
  };
 
  toggleEdit() {
    this.isEdit = !this.isEdit;
  }
 
  private readonly ndaPrintStyles = `
    @page { size: A4; margin: 12mm 18mm; }
    * { box-sizing: border-box; }
    body {
      font-family: 'Times New Roman', Times, serif;
      font-size: 10pt;
      line-height: 1.5;
      color: #000;
      background: #fff;
      padding: 0;
      margin: 0;
    }
    /* Letterhead blank + pin page-1 body to bottom */
    .nda-letterhead-spacer {
      display: block;
      height: 100mm;
      min-height: 100mm;
      width: 100%;
      overflow: hidden;
      flex-shrink: 0;
    }
    .nda-letterhead-spacer::after {
      content: '\\00a0';
      display: block;
      height: 100mm;
      line-height: 100mm;
      font-size: 1px;
    }
    .nda-first-page {
      min-height: 257mm;
      height: 257mm;
      display: flex;
      flex-direction: column;
      page-break-after: always;
      break-after: page;
    }
    .nda-page1-body {
      margin-top: auto;
      padding-bottom: 4mm;
    }
    .nda-first-page .nda-page1-end {
      margin-top: auto;
      margin-bottom: 0;
    }
    .nda-mid-page {
      page-break-after: always;
      break-after: page;
    }
    .nda-last-page {
      min-height: 257mm;
      display: flex;
      flex-direction: column;
      page-break-before: auto;
    }
    .nda-end-block {
      margin-top: auto;
      padding-top: 16px;
      page-break-inside: avoid;
    }
    h3, .nda-title {
      text-align: center;
      text-decoration: underline;
      font-weight: bold;
      font-size: 12pt;
      margin: 12px 0 12px 0;
    }
    p, .nda-clause2-continue {
      margin: 8px 0;
      text-align: justify;
    }
    .nda-clause2-continue { margin-left: 22px; }
    .nda-intro { margin-top: 8px; margin-bottom: 12px; }
    ol.nda-terms, ol { padding-left: 22px; margin: 8px 0; }
    ul { padding-left: 20px; }
    li { margin-bottom: 10px; text-align: justify; }
    table { width: 100%; border-collapse: collapse; }
    table td { vertical-align: top; border: none !important; }
    .nda-meta { margin-top: 0; }
    .nda-sign-table { margin-top: 36px !important; }
    .nda-sign-table td { padding-top: 12px; }
    .nda-sign-table p { margin: 6px 0; }
    input { border: none; border-bottom: 1px solid #000; outline: none; }
    .nda-page-break { display: none; }
    .ord-sup {
      font-size: 0.65em;
      vertical-align: super;
      line-height: 0;
    }
  `;
 
  private getDaySuffix(day: number): string {
    if (day >= 11 && day <= 13) return 'th';
    switch (day % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  }
 
  /** e.g. 21st Apr, 2026 */
  formatNdaDate(dateValue: string | Date | null | undefined): string {
    const parts = this.getNdaDateParts(dateValue);
    if (!parts) return '';
    return `${parts.day}${parts.suffix} ${parts.month}, ${parts.year}`;
  }
 
  /** e.g. 21<sup>st</sup> Apr, 2026 */
  formatNdaDateHtml(dateValue: string | Date | null | undefined): string {
    const parts = this.getNdaDateParts(dateValue);
    if (!parts) return '';
    return `${parts.day}<sup class="ord-sup">${parts.suffix}</sup> ${parts.month}, ${parts.year}`;
  }
 
  private getNdaDateParts(
    dateValue: string | Date | null | undefined
  ): { day: number; suffix: string; month: string; year: number } | null {
    if (!dateValue) return null;
    const date =
      typeof dateValue === 'string'
        ? new Date(dateValue.includes('T') ? dateValue : `${dateValue}T00:00:00`)
        : dateValue;
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
 
  private replaceInputsWithText(el: HTMLElement): void {
    el.querySelectorAll('.nda-date-preview').forEach((n) => n.remove());
    el.querySelectorAll('input').forEach((input: any) => {
      const span = document.createElement('span');
      span.style.fontWeight = 'normal';
      if (input.type === 'date' && input.value) {
        span.innerHTML = this.formatNdaDateHtml(input.value);
      } else {
        span.textContent = input.value || '';
      }
      input.parentNode.replaceChild(span, input);
    });
  }
 
  downloadPDF() {
    const element = document.getElementById('nda-doc');
    if (!element) return;
 
    const cloned = element.cloneNode(true) as HTMLElement;
    this.replaceInputsWithText(cloned);
 
    html2pdf().from(cloned).set({
      margin: 10,
      filename: this.documentName + '.pdf',
      html2canvas: {
        scale: 2,
        // Strip Bootstrap/app stylesheets that use CSS color() unsupported by html2canvas
        onclone: (clonedDoc: Document) => {
          Array.from(clonedDoc.querySelectorAll('link[rel="stylesheet"], style')).forEach(s => s.remove());
          const style = clonedDoc.createElement('style');
          style.textContent = this.ndaPrintStyles;
          clonedDoc.head.appendChild(style);
        }
      } as any,
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    }).save();
  }
 
  printDoc() {
    const element = document.getElementById('nda-doc');
    if (!element) return;
 
    const cloned = element.cloneNode(true) as HTMLElement;
    this.replaceInputsWithText(cloned);
 
    const content = `<!DOCTYPE html><html><head><title>NDA</title>
      <style>${this.ndaPrintStyles}</style>
    </head><body>${cloned.innerHTML}</body></html>`;
 
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;left:-9999px;width:1px;height:1px;border:0;';
    iframe.setAttribute('srcdoc', content);
    document.body.appendChild(iframe);
 
    iframe.onload = () => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => document.body.removeChild(iframe), 1000);
    };
  }
downloadDoc() {
  const element = document.getElementById('nda-doc');
 
  if (!element) return;
 
  // Clone so we can modify before download
  const cloned = element.cloneNode(true) as HTMLElement;
  this.replaceInputsWithText(cloned);
 
  // Create Word-compatible HTML
  const html = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office'
          xmlns:w='urn:schemas-microsoft-com:office:word'>
    <head>
      <meta charset='utf-8'>
      <title>NDA</title>
      <style>
        @page { size: A4; margin: 12mm 18mm; }
        body {
          font-family: 'Times New Roman', Times, serif;
          font-size: 10pt;
          line-height: 1.5;
          padding: 0;
          margin: 0;
        }
        .nda-letterhead-spacer {
          display: block;
          height: 100mm;
          min-height: 100mm;
          width: 100%;
          overflow: hidden;
          flex-shrink: 0;
          mso-line-height-rule: exactly;
          line-height: 100mm;
          font-size: 1pt;
        }
        .nda-letterhead-spacer::after {
          content: '\\00a0';
          display: block;
          height: 100mm;
          line-height: 100mm;
          font-size: 1px;
        }
        .nda-first-page {
          min-height: 257mm;
          height: 257mm;
          display: flex;
          flex-direction: column;
          page-break-after: always;
          break-after: page;
        }
        .nda-page1-body {
          margin-top: auto;
          padding-bottom: 4mm;
        }
        .nda-first-page .nda-page1-end {
          margin-top: auto;
          margin-bottom: 0;
        }
        .nda-mid-page {
          page-break-after: always;
          break-after: page;
        }
        .nda-last-page {
          min-height: 257mm;
          display: flex;
          flex-direction: column;
          page-break-before: auto;
        }
        .nda-end-block {
          margin-top: auto;
          padding-top: 16px;
          page-break-inside: avoid;
        }
        h3, .nda-title {
          text-align: center;
          text-decoration: underline;
          font-weight: bold;
          font-size: 12pt;
          margin: 28px 0 12px 0;
        }
        p, .nda-clause2-continue { text-align: justify; margin: 8px 0; }
        .nda-clause2-continue { margin-left: 22px; }
        ol { padding-left: 22px; margin: 8px 0; }
        li { margin-bottom: 10px; }
        table { width: 100%; border-collapse: collapse; }
        table td { border: none; vertical-align: top; }
        .nda-meta { margin-top: 0; }
        .nda-sign-table { margin-top: 36px !important; }
        .nda-sign-table p { margin: 6px 0; }
        .nda-page-break { display: none; }
        .ord-sup {
          font-size: 0.65em;
          vertical-align: super;
          line-height: 0;
        }
      </style>
    </head>
    <body>
      ${cloned.innerHTML}
    </body>
    </html>
  `;
 
  const blob = new Blob(['\ufeff', html], {
    type: 'application/msword'
  });
 
  const url = URL.createObjectURL(blob);
 
  const a = document.createElement('a');
  a.href = url;
  a.download = 'NDA.doc';
  a.click();
 
  URL.revokeObjectURL(url);
}
}