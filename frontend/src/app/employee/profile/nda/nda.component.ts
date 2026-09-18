import { Component, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import SignaturePad from 'signature_pad';
import html2pdf from 'html2pdf.js';
import { Notyf } from 'notyf';
import { FormsModule } from "@angular/forms";
import { CommonModule, DatePipe } from '@angular/common';
import { EmployeeService } from '../../../services/employee.service';
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
 constructor(private employeeService: EmployeeService) {

    this.personalDetails = JSON.parse(localStorage.getItem('employeeId') || '{}');
    this.tenant = JSON.parse(localStorage.getItem('tenant') || '{}');
    this.notyf = new Notyf();
    this.loadData();
  }

  loadData(): void {
    this.employeeService.getLetterData(this.personalDetails.id, 'nda').subscribe({
      next: (res: any) => {
        if (res.status && res.data) {
          if (res.data.date) this.personalDetails.date = res.data.date;
          if (res.data.place) this.personalDetails.place = res.data.place;
        }
      },
      error: () => {}
    });
  }

  saveData(): void {
    this.employeeService.saveLetterData(this.personalDetails.id, 'nda', {
      date: this.personalDetails.date,
      place: this.personalDetails.place
    }).subscribe({ error: () => {} });
  }
  isEdit = false;

  documentName = "NDA Agreement";

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
      font-size: 12pt;
      line-height: 1.55;
      color: #000;
      background: #fff;
      padding: 0;
      margin: 0;
    }
    /* Letterhead blank — sized so page-1 content fits through “…made, created or” */
    .nda-letterhead-spacer {
      display: block;
      height: 150mm;
      min-height: 150mm;
    }
    .nda-first-page {
      page-break-after: always;
      break-after: page;
    }
    h3, .nda-title {
      text-align: center;
      text-decoration: underline;
      font-weight: bold;
      font-size: 13pt;
      margin: 0 0 14px 0;
    }
    p, .nda-clause2-continue {
      margin: 8px 0;
      text-align: justify;
    }
    .nda-clause2-continue { margin-left: 22px; }
    .nda-intro { margin-top: 6px; }
    ol.nda-terms, ol { padding-left: 22px; margin: 8px 0; }
    ul { padding-left: 20px; }
    li { margin-bottom: 8px; text-align: justify; }
    table { width: 100%; border-collapse: collapse; }
    table td { vertical-align: top; border: none !important; }
    input { border: none; border-bottom: 1px solid #000; outline: none; }
    .nda-page-break { display: none; }
  `;

  private replaceInputsWithText(el: HTMLElement): void {
    el.querySelectorAll('input').forEach((input: any) => {
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
    iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:0;';
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

  // 🔥 Replace input fields with values
  const inputs = cloned.querySelectorAll('input');

  inputs.forEach((input: any) => {
    const value = input.value || '';
    const span = document.createElement('span');
    span.innerText = value;
    input.parentNode.replaceChild(span, input);
  });

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
          font-size: 12pt;
          line-height: 1.55;
          padding: 0;
          margin: 0;
        }
        .nda-letterhead-spacer {
          display: block;
          height: 150mm;
          min-height: 150mm;
        }
        .nda-first-page {
          page-break-after: always;
          break-after: page;
        }
        h3, .nda-title {
          text-align: center;
          text-decoration: underline;
          font-weight: bold;
        }
        p, .nda-clause2-continue { text-align: justify; margin: 8px 0; }
        .nda-clause2-continue { margin-left: 22px; }
        ol { padding-left: 22px; }
        table { width: 100%; border-collapse: collapse; }
        table td { border: none; vertical-align: top; }
        .nda-page-break { display: none; }
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
