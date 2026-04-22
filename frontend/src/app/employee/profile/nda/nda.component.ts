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
    @page { margin: 0; }
    body { font-family: 'Times New Roman'; line-height: 1.6; padding: 15mm 20mm; color: #000; background: #fff; }
    h3 { text-align: center; text-decoration: underline; }
    ol { padding-left: 20px; }
    ul { padding-left: 20px; }
    table { width: 100%; border-collapse: collapse; }
    p { margin: 8px 0; }
  `;

  private replaceInputsWithText(el: HTMLElement): void {
    el.querySelectorAll('input').forEach((input: any) => {
      const span = document.createElement('span');
      span.innerText = input.value || '';
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
        body { font-family: 'Times New Roman'; line-height: 1.6; }
        h3 { text-align: center; text-decoration: underline; }
        ol { padding-left: 20px; }
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
