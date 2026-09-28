import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Notyf } from 'notyf';
import { DataService } from '../../../services/data.service';
import { PayrollService } from '../../../services/payroll.service';
import { StatusService } from '../../../services/status.service';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PageBreak } from 'docx';
import { EmployeeService } from '../../../services/employee.service';
import { MasterService } from '../../../services/master.service';


@Component({
  selector: 'app-offer-letter',
  imports: [DatePipe, CommonModule, FormsModule],
  templateUrl: './offer-letter.component.html',
  styleUrl: './offer-letter.component.css'
})
export class OfferLetterComponent implements OnInit {
  personalDetails: any = {}
  tenant: any = {}
  notyf: Notyf;
  minDate: any
  currency: any
  obj: any = {}
  isDownload: boolean = false
  letterheadImage: string = '/assets/img/Letterhead-1.png'
  tenantLetterheadUrl: string | null = null

  constructor(
    public payrollService: PayrollService,
    private router: Router,
    public statusService: StatusService,
    public dataService: DataService,
    private employeeService: EmployeeService,
    private masterService: MasterService
  ) {
    this.tenant = JSON.parse(localStorage.getItem('tenant') || '{}');
    this.notyf = new Notyf();
    const today = new Date();
    this.minDate = today.toISOString().split('T')[0];
    this.personalDetails = JSON.parse(localStorage.getItem('employeeId') || '{}');
    this.currency = JSON.parse(localStorage.getItem('currency') || '{}');
  }

  ngOnInit() {
    this.masterService.getLetterhead().subscribe({
      next: (res: any) => {
        const url = res?.data?.url;
        if (url) {
          this.tenantLetterheadUrl = url;
          this.getBase64FromSrc(url)
            .then(base64 => { this.letterheadImage = base64; })
            .catch(() => {});
        } else {
          this.getBase64ImageFromUrl('/assets/img/Letterhead-2.png')
            .then(base64 => { this.letterheadImage = base64; })
            .catch(() => {});
        }
      },
      error: () => {
        this.getBase64ImageFromUrl('/assets/img/Letterhead-2.png')
          .then(base64 => { this.letterheadImage = base64; })
          .catch(() => {});
      }
    });
    this.resolveDesignationAndDepartment();
    this.loadData();
  }

  get designationLabel(): string {
    return (
      this.personalDetails?.designation ||
      this.personalDetails?.designation_name ||
      this.personalDetails?.designationName ||
      this.personalDetails?.Designation ||
      ''
    );
  }

  get departmentLabel(): string {
    return (
      this.personalDetails?.department ||
      this.personalDetails?.department_name ||
      this.personalDetails?.departmentName ||
      this.personalDetails?.Department ||
      ''
    );
  }

  /** Resolve names from designationId / departmentId when profile only has IDs. */
  private resolveDesignationAndDepartment(): void {
    const pd = this.personalDetails || {};

    // Prefer any name already on the profile object
    if (!String(pd.designation || '').trim()) {
      const fromProfile =
        pd.designation_name || pd.designationName || pd.Designation || '';
      if (fromProfile) pd.designation = String(fromProfile).trim();
    }
    if (!String(pd.department || '').trim()) {
      const fromProfile =
        pd.department_name || pd.departmentName || pd.Department || '';
      if (fromProfile) pd.department = String(fromProfile).trim();
    }

    const departmentId = pd.departmentId?.value || pd.departmentId;
    const designationId = pd.designationId?.value || pd.designationId;

    if (departmentId && !String(pd.department || '').trim()) {
      this.masterService.Departmentsdd({}).subscribe({
        next: (res: any) => {
          if (!Array.isArray(res?.data)) return;
          const match = res.data.find(
            (d: any) => String(d.value) === String(departmentId),
          );
          if (match?.label) {
            this.personalDetails.department = match.label;
            this.personalDetails.department_name = match.label;
          }
        },
        error: () => {},
      });
    }

    if (designationId && !String(pd.designation || '').trim()) {
      const loadDesignation = (deptKey: any) => {
        this.masterService
          .designationDD(deptKey ? { department: deptKey } : {})
          .subscribe({
            next: (res: any) => {
              if (String(this.personalDetails?.designation || '').trim()) return;
              if (!Array.isArray(res?.data)) return;
              const match = res.data.find(
                (d: any) => String(d.value) === String(designationId),
              );
              if (match?.label) {
                this.personalDetails.designation = match.label;
                this.personalDetails.designation_name = match.label;
              }
            },
            error: () => {},
          });
      };
      loadDesignation(departmentId);
    }
  }

  loadData(): void {
    this.employeeService.getLetterData(this.personalDetails.id, 'offer').subscribe({
      next: (res: any) => {
        if (res.status && res.data) {
          if (res.data.refNo) this.personalDetails.refNo = res.data.refNo;
          if (res.data.offerDate) this.personalDetails.offerDate = res.data.offerDate;
          if (res.data.designation) this.personalDetails.designation = res.data.designation;
          if (res.data.department) this.personalDetails.department = res.data.department;
        }
        this.resolveDesignationAndDepartment();
      },
      error: () => {
        this.resolveDesignationAndDepartment();
      }
    });
  }

  saveData(): void {
    this.employeeService.saveLetterData(this.personalDetails.id, 'offer', {
      refNo: this.personalDetails.refNo,
      offerDate: this.personalDetails.offerDate
    }).subscribe({ error: () => {} });
  }

  onLetterheadUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      this.letterheadImage = e.target?.result as string;
    };
    reader.readAsDataURL(input.files[0]);
  }

  getBase64ImageFromUrl(url: string): Promise<string> {
    return fetch(url)
      .then(res => res.blob())
      .then(blob => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      }));
  }
  getBase64FromSrc(src: string): Promise<string> {
    return fetch(src)
      .then(r => r.blob())
      .then(blob => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      }));
  }

  formatOrdinalDate(value: string | Date | null | undefined): string {
    if (!value) return '';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';

    const day = date.getDate();
    const month = date.toLocaleString('en-US', { month: 'long' });
    const year = date.getFullYear();

    return `${day}${this.getOrdinalSuffix(day)} ${month}, ${year}`;
  }

  formatOrdinalDateHtml(value: string | Date | null | undefined): string {
    if (!value) return '';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';

    const day = date.getDate();
    const month = date.toLocaleString('en-US', { month: 'long' });
    const year = date.getFullYear();

    return `${day}<sup style="font-size:0.65em;vertical-align:super;text-transform:none;font-weight:normal;">${this.getOrdinalSuffix(day)}</sup> ${month}, ${year}`;
  }

  formatAddressHtml(address: string | null | undefined): string {
    return this.addressLines(address)
      .map((line) =>
        line
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/ {2}/g, ' &nbsp;'),
      )
      .join('<br>');
  }

  /** Split permanent address on real or escaped newlines; keep spaces on each line. */
  addressLines(address: string | null | undefined): string[] {
    return String(address || '')
      .replace(/\\r\\n|\\n|\\r/g, '\n')
      .split(/\r\n|\r|\n/)
      .map((line) => line.replace(/\s+$/g, ''))
      .filter((line, i, arr) => line.length > 0 || (i > 0 && i < arr.length - 1));
  }

  /** Strip honorific so we don't print "S/O Mr. Mr. Name". */
  fatherNameDisplay(name: string | null | undefined): string {
    return String(name || '')
      .replace(/^\s*(mr\.?|mrs\.?|ms\.?|miss)\s+/i, '')
      .trim();
  }

  private getOrdinalSuffix(day: number): string {
    if (day >= 11 && day <= 13) return 'th';

    switch (day % 10) {
      case 1:
        return 'st';
      case 2:
        return 'nd';
      case 3:
        return 'rd';
      default:
        return 'th';
    }
  }
printDoc() {
  this.isDownload = true;

  this.getBase64FromSrc('/assets/img/Letterhead-2.png')
    .then((bgImage) => {

      const element = document.getElementById('offer-doc');
      if (!element) {
        this.isDownload = false;
        return;
      }

      const content = element.outerHTML;

      const printWindow = window.open('', '_blank', 'width=900,height=700');
      if (!printWindow) {
        this.isDownload = false;
        return;
      }

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Offer Letter</title>
            <style>

            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              box-sizing: border-box;
            }

            body {
              margin: 0;
              font-family: "Calibri", "Calibri (Body)", Candara, Segoe, "Segoe UI", Optima, Arial, sans-serif;
            }

            /* 🔥 APPLY BACKGROUND DIRECTLY TO YOUR DIV */
            #offer-doc {
              width: 21cm;
              min-height: 29.7cm;
              padding: 100px 60px;
              position: relative;
              font-family: "Calibri", "Calibri (Body)", Candara, Segoe, "Segoe UI", Optima, Arial, sans-serif;

              background-image: url('${bgImage}');
              background-repeat: no-repeat;
              background-size: 100% 100%;
            }

            .address-lines,
            .address-lines span {
              display: block !important;
              white-space: pre-wrap !important;
              word-wrap: break-word;
            }

            input {
              border: none;
              outline: none;
              background: transparent;
              font-family: inherit;
              font-size: inherit;
            }

            @media print {
              body { margin: 0; }
              @page { margin: 0; size: A4; }
            }

            </style>
          </head>

          <body>
            ${content}
          </body>
        </html>
      `);

      printWindow.document.close();
      printWindow.focus();

      setTimeout(() => {
        printWindow.print();
        this.isDownload = false;
      }, 500);

    })
    .catch(err => {
      console.error(err);
      this.isDownload = false;
    });
}

  async downloadPDF() {
    this.isDownload = true;

    await new Promise(resolve => setTimeout(resolve, 1000));

    const bgImage = await this.getBase64FromSrc('/assets/img/Letterhead-2.png');

    const element = document.getElementById('offer-doc');
    if (!element) {
      this.isDownload = false;
      return;
    }

    // Clone element and apply letterhead background (matching printDoc)
    const cloned = element.cloneNode(true) as HTMLElement;
    cloned.style.width = '21cm';
    cloned.style.minHeight = '29.5cm';
    cloned.style.padding = '100px 60px';
    cloned.style.position = 'relative';
    cloned.style.backgroundImage = `url(${bgImage})`;
    cloned.style.backgroundRepeat = 'no-repeat';
    cloned.style.backgroundSize = '100% 100%';
    cloned.style.boxSizing = 'border-box';

    const html2pdfModule = await import('html2pdf.js');
    const html2pdf = (html2pdfModule as any).default || html2pdfModule;

    const opt = {
      margin: [0, 0, 0, 0],
      filename: `OfferLetter_${this.personalDetails.firstName || 'Employee'}.pdf`,
      image: { type: 'jpeg', quality: 1},
      html2canvas: {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false
      },
      jsPDF: {
        unit: 'mm',
        format: 'a4',
        orientation: 'portrait',
        pagesplit: false,
        PageBreak: 'avoid-all',

      }
    };

    html2pdf().set(opt).from(cloned).save().then(() => {
      this.isDownload = false;
    });
  }

  isGeneratingPdf = false;

  generateServerPdf(): void {
    this.isGeneratingPdf = true;
    this.employeeService.generateLetterPdf(this.personalDetails.id, 'offer').subscribe({
      next: (res: any) => {
        if (res.status && res.data?.downloadUrl) {
          window.open(res.data.downloadUrl, '_blank');
        } else {
          this.notyf.error(res.message || 'Failed to generate PDF.');
        }
        this.isGeneratingPdf = false;
      },
      error: () => {
        this.notyf.error('Server error. Please try again.');
        this.isGeneratingPdf = false;
      }
    });
  }
}
