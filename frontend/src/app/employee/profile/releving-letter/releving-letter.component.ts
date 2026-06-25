import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Notyf } from 'notyf';
import { EmployeeService } from '../../../services/employee.service';
import { MasterService } from '../../../services/master.service';
@Component({
  selector: 'app-releving-letter',
  imports: [CommonModule, FormsModule, DatePipe],
  templateUrl: './releving-letter.component.html',
  styleUrl: './releving-letter.component.css'
})
export class RelevingLetterComponent implements OnInit {
  personalDetails: any = {};
  tenant: any = {};
  notyf: Notyf;
  isDownload = false;
  tenantLetterheadUrl: string = '/assets/img/Letterhead-2.png';

  relievingDate: string = '';
  joiningDate: string = '';
  refNo: string = '';
  todayDate: string = '';

  constructor(private router: Router, private employeeService: EmployeeService, private masterService: MasterService) {
    this.notyf = new Notyf();
    this.personalDetails = JSON.parse(localStorage.getItem('employeeId') || '{}');
    this.tenant = JSON.parse(localStorage.getItem('tenant') || '{}');

    const today = new Date();
    this.todayDate = today.toISOString().split('T')[0];
    this.relievingDate = this.personalDetails.relievingDate || this.personalDetails.dol || this.todayDate;
    this.joiningDate = this.personalDetails.doj || this.personalDetails.joiningDate || '';

    const year = today.getFullYear();
    const seq = String(Math.floor(Math.random() * 900) + 100).padStart(3, '0');
    this.refNo = this.personalDetails.relRefNo || `${year}/${seq}`;

    this.loadData();
  }

  ngOnInit(): void {
    this.masterService.getLetterhead().subscribe({
      next: (res: any) => {
        if (res?.data?.url) this.tenantLetterheadUrl = res.data.url;
      },
      error: () => {}
    });
  }

  loadData(): void {
    this.employeeService.getLetterData(this.personalDetails.id, 'relieving').subscribe({
      next: (res: any) => {
        if (res.status && res.data) {
          if (res.data.relievingDate) this.relievingDate = res.data.relievingDate;
          if (res.data.joiningDate) this.joiningDate = res.data.joiningDate;
          if (res.data.refNo) this.refNo = res.data.refNo;
        }
      },
      error: () => {}
    });
  }

  saveData(): void {
    this.employeeService.saveLetterData(this.personalDetails.id, 'relieving', {
      relievingDate: this.relievingDate,
      joiningDate: this.joiningDate,
      refNo: this.refNo
    }).subscribe({ error: () => {} });
  }

  get salutation(): string {
    const gender = (this.personalDetails.gender || '').toLowerCase();
    return gender == 'female' ? 'Ms.' : 'Mr.';
  }

  get employeeFullName(): string {
    return `${this.personalDetails.firstName || ''} ${this.personalDetails.lastName || ''}`.trim();
  }

  get fatherPrefix(): string {
    const gender = (this.personalDetails.gender || '').toLowerCase();
    return gender == 'female' ? 'D/O' : 'S/O';
  }

  get relievingData(): any {
    return {
      name:`${this.salutation} ${this.employeeFullName}`,
      fatherName: this.personalDetails.fatherName || '',
      address: this.personalDetails.address || '',
      subject: 'Relieving Cum Experience Letter',
      greeting: `Dear ${this.personalDetails.firstName || 'Employee'},`,
      body1: `You are hereby relieved from the services of the company by the closing hours of <b> ${this.formatDate(this.relievingDate)}</b>.We wish to place on record that you had been under the employment from <b>${this.formatDate(this.joiningDate)}</b> to <b> ${this.formatDate(this.relievingDate)}</b> with the current position as '${this.personalDetails.designation || '_______________'}'.`,
      // body2: ``,
      body3: `<br>All the dues will be paid to you as Full & Final Settlement.`,
      body4: `<br>We thank you for your contribution to the Company and wish you all success in your future endeavors.`,
      closing: `With warm regards,\n\n\n\n\n <b>Human Resource Department</b> \nDate: ${this.formatDate(new Date().toISOString())}`
    };
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '___';
    const d = new Date(dateStr);
    const day = d.getDate();
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const sup = (n: number) => n === 1 || n === 21 || n === 31 ? 'st' : n === 2 || n === 22 ? 'nd' : n === 3 || n === 23 ? 'rd' : 'th';
    return `${day}<sup>${sup(day)}</sup> ${months[d.getMonth()]},${d.getFullYear()}`;
  }

  printDoc() {
    const bgBase64Promise = this.getBase64FromSrc(this.tenantLetterheadUrl).catch(() => '');

    Promise.all([bgBase64Promise]).then(([bgImage]) => {

      const relievingData = {
        ...this.relievingData,
        closing: `With warm regards<br/><br/><br/><b>Human Resource Department</b><br/>Date: ${new Date().toLocaleDateString('en-GB')}`
      };
      const relievingDate = this.relievingDate ? this.formatDate(this.relievingDate) : new Date().toLocaleDateString('en-GB');
      const joiningDate = this.joiningDate ? this.formatDate(this.joiningDate) : new Date().toLocaleDateString('en-GB');
      const refNo = this.refNo || '001';

      const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Relieving Letter</title>

<style>
* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: "Calibri", sans-serif;
  font-size: 13px;
  color: #000;
}

.page {
  width: 21cm;
  height: 29.7cm;
  padding: 130px 60px 120px 60px;
  position: relative;
  overflow: hidden;
  background-image: url('${bgImage}');
  background-repeat: no-repeat;
  background-size: 100% 100%;
}

.ref-date-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
}

.address-block {
  margin: 12px 0;
  line-height: 1.6;
}

.regards {
  margin-top: 30px;
  line-height: 1.6;
}

.subject-line {
  margin: 14px 0;
}

.salutation-line {
  margin: 12px 0;
  font-weight: bold;
}

.body-para {
  margin-bottom: 8px;
  line-height: 1.5;
}

@media print {
  body {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  @page {
    size: A4 portrait;
    margin: 0;
  }
}
</style>
</head>

<body>

<div class="page">

  <div class="ref-date-row">
    <div class="ref-left"><b>Ref: Quaere/Emp/Relieving/${refNo}</b></div>
    <div class="dated-right"><b>Dated: ${relievingDate}</b></div>
  </div>

  <div class="address-block">
 <b>${relievingData.name} </b> <br/>
    <b> D/O ${relievingData.fatherName}</b> <br/>
     <b>  ${(this.personalDetails.permanentAddress || '').replace(/\n/g, '<br/>')}</b><br/>
  </div>

  <div class="subject-line">
    Subject: <b><u>${relievingData.subject}</u></b>
  </div>

  <div class="salutation-line">
    ${relievingData.greeting}
  </div>

  <div class="body-para">
    ${relievingData.body1}
  </div>



  <div class="body-para">
    ${relievingData.body3}
  </div>
  <div class="body-para">
    ${relievingData.body4}
  </div>
  <div class="regards">
    ${relievingData.closing.replace(/\\n/g, '<br/>')}
  </div>

</div>

</body>
</html>
`;

      const printWindow = window.open('', '', 'width=900,height=650');
      printWindow!.document.write(html);
      printWindow!.document.close();
      printWindow!.focus();

      setTimeout(() => {
        printWindow!.print();
        printWindow!.close();
      }, 1000);
    });
  }

  getBase64FromSrc(src: string): Promise<string> {
    return fetch(src, { mode: 'cors' })
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.blob();
      })
      .then(blob => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      }));
  }

  downloadDoc() {
    this.isDownload = true;
    const element = document.getElementById('relieving-doc');
    if (!element) return;

    const cloned = element.cloneNode(true) as HTMLElement;
    const inputs = cloned.querySelectorAll('input');
    inputs.forEach((input: any) => {
      const span = document.createElement('span');
      span.innerText = input.value || '';
      input.parentNode?.replaceChild(span, input);
    });

    const images = element.getElementsByTagName('img');
    const imgPromises: Promise<void>[] = [];
    for (let img of images) {
      imgPromises.push(this.convertImageToBase64(img));
    }

    const letterheadPromise = fetch(this.tenantLetterheadUrl)
      .then(r => r.blob())
      .then(blob => new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      }));

    Promise.all([Promise.all(imgPromises), letterheadPromise]).then(([, bgBase64]) => {
      const html = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office'
              xmlns:w='urn:schemas-microsoft-com:office:word'
              xmlns='http://www.w3.org/TR/REC-html40'>
          <head>
            <meta charset='utf-8'>
            <title>Relieving Letter</title>
            <style>
              body { font-family: "Calibri", sans-serif; font-size: 13px; color: #000; margin: 0; padding: 0; }
              @page WordSection1 {
                mso-header-margin: 0cm;
                mso-footer-margin: 0cm;
                mso-header: h1;
              }
              div.WordSection1 { page: WordSection1; }
            </style>
            <!--[if gte mso 9]>
            <xml>
              <w:WordDocument>
                <w:View>Normal</w:View>
                <w:Zoom>100</w:Zoom>
              </w:WordDocument>
            </xml>
            <![endif]-->
          </head>
          <body>
            <div class="WordSection1">
              <div id="letterhead-header" style="position:relative; width:100%; margin:0; padding:0;">
                <img src="${bgBase64}" style="width:100%; display:block;" />
              </div>
              <div style="padding: 20px 60px 60px 60px; margin-top: -40px;">
                ${cloned.innerHTML}
              </div>
            </div>
          </body>
        </html>
      `;
      const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Relieving_Letter_${this.employeeFullName || 'Employee'}.doc`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      this.isDownload = false;
    });
  }

  convertImageToBase64(img: HTMLImageElement): Promise<void> {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const image = new Image();
      image.crossOrigin = 'anonymous';
      image.src = img.src;
      image.onload = () => {
        canvas.width = image.width;
        canvas.height = image.height;
        ctx?.drawImage(image, 0, 0);
        img.src = canvas.toDataURL('image/png');
        resolve();
      };
      image.onerror = () => resolve();
    });
  }

  isGeneratingPdf = false;

  generateServerPdf(): void {
    this.isGeneratingPdf = true;
    this.employeeService.generateLetterPdf(this.personalDetails.id, 'relieving').subscribe({
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
