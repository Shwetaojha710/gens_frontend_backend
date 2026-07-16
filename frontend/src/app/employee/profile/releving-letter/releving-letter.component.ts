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
  tenantLetterheadUrl: string = '/assets/img/Letterhead-2.png';

  relievingDate: string = '';
  joiningDate: string = '';
  refNo: string = '';
  todayDate: string = '';
  address: string = '';
  addressCity: string = '';
  addressState: string = '';
  addressPinCode: string = '';

  constructor(private router: Router, private employeeService: EmployeeService, private masterService: MasterService) {
    this.notyf = new Notyf();
    this.personalDetails = JSON.parse(localStorage.getItem('employeeId') || '{}');
    this.tenant = JSON.parse(localStorage.getItem('tenant') || '{}');

    const today = new Date();
    this.todayDate = today.toISOString().split('T')[0];
    this.relievingDate = this.personalDetails.relievingDate || this.personalDetails.dol || this.todayDate;
    this.joiningDate = this.personalDetails.doj || this.personalDetails.joiningDate || '';
    this.address = this.personalDetails.permanentAddress || '';
    this.addressCity = this.personalDetails.city || '';
    this.addressState = this.personalDetails.state || '';
    this.addressPinCode = this.personalDetails.pinCode || '';

    const year = today.getFullYear();
    const seq = String(Math.floor(Math.random() * 900) + 100).padStart(3, '0');
    this.refNo = this.personalDetails.relRefNo || `${year}/${seq}`;

    this.loadData();
  }

  ngOnInit(): void {
    this.masterService.getLetterhead().subscribe({
      next: (res: any) => {
        if (res?.data?.base64) this.tenantLetterheadUrl = res.data.base64;
        else if (res?.data?.url) this.tenantLetterheadUrl = res.data.url;
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
          if (res.data.address) this.address = res.data.address;
          if (res.data.addressCity) this.addressCity = res.data.addressCity;
          if (res.data.addressState) this.addressState = res.data.addressState;
          if (res.data.addressPinCode) this.addressPinCode = res.data.addressPinCode;
        }
      },
      error: () => {}
    });
  }

  saveData(): void {
    this.employeeService.saveLetterData(this.personalDetails.id, 'relieving', {
      relievingDate: this.relievingDate,
      joiningDate: this.joiningDate,
      refNo: this.refNo,
      address: this.address,
      addressCity: this.addressCity,
      addressState: this.addressState,
      addressPinCode: this.addressPinCode
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

  private buildLetterContentHtml(): string {
    const relievingData = {
      ...this.relievingData,
      closing: `With warm regards<br/><br/><br/><b>Human Resource Department</b><br/>Date: ${new Date().toLocaleDateString('en-GB')}`
    };
    const relievingDate = this.relievingDate ? this.formatDate(this.relievingDate) : new Date().toLocaleDateString('en-GB');
    const refNo = this.refNo || '001';
    const cityStateLine = [this.addressCity, this.addressState].filter(Boolean).join(', ') + (this.addressPinCode ? ` - ${this.addressPinCode}` : '');

    return `
  <table class="ref-date-row" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;"><tr>
    <td class="ref-left" style="text-align:left; vertical-align:top;"><b>Ref: Quaere/Emp/Relieving/${refNo}</b></td>
    <td class="dated-right" style="text-align:right; vertical-align:top;"><b>Dated: ${relievingDate}</b></td>
  </tr></table>

  <div class="address-block">
 <b>${relievingData.name} </b> <br/>
    <b> ${this.fatherPrefix} ${relievingData.fatherName}</b> <br/>
     <b>  ${(this.address || '').replace(/\n/g, '<br/>')}</b><br/>
     ${cityStateLine ? `<b>${cityStateLine}</b><br/>` : ''}
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
`;
  }

  printDoc() {
    const bgBase64Promise = this.getBase64FromSrc(this.tenantLetterheadUrl).catch(() => '');

    Promise.all([bgBase64Promise]).then(([bgImage]) => {
      const content = this.buildLetterContentHtml();

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
${content}
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
    const logoPromise = this.getBase64FromSrc('/assets/img/logo/logo-quaere.png').catch(() => '');
    const badge1Promise = this.getBase64FromSrc('/assets/img/logo/Picture1.jpg').catch(() => '');
    const badge2Promise = this.getBase64FromSrc('/assets/img/logo/Picture2.png').catch(() => '');

    Promise.all([logoPromise, badge1Promise, badge2Promise]).then(([logoBase64, badge1Base64, badge2Base64]) => {
      const content = this.buildLetterContentHtml();

      const headerHtml = logoBase64 ? `<img src="${logoBase64}" width="180" style="height:auto; display:block;" />` : '';

      const footerHtml = `
        <table cellpadding="0" cellspacing="0" style="font-size:10.5px; line-height:1.6; color:#000;">
          <tr>
            <td width="15" style="background:#1f6fb2; font-size:4px; line-height:1px;">&nbsp;</td>
            <td width="16" style="font-size:1px; line-height:4px;">&nbsp;</td>
            <td width="300" valign="middle">
              <b>Quaere Etechnologies Private Limited</b> AN ISO 9001 : 2015<br/>
              7th Floor, Cyber Tower, Vibhuti Khand,<br/>
              Gomti Nagar, Lucknow, U.P.-226010<br/>
              Web: www.quaeretech.com<br/>
              E-mail: info@quaeretech.com | Tel: 0522-4067760<br/>
              <br/>
              <b>GSTN- 09AAACQ1581F1ZI</b>
            </td>
            <td width="40">&nbsp;</td>
            <td valign="middle">
              ${badge1Base64 ? `<img src="${badge1Base64}" height="38" style="margin-right:8px; vertical-align:middle;" />` : ''}
              ${badge2Base64 ? `<img src="${badge2Base64}" height="38" style="vertical-align:middle;" />` : ''}
            </td>
          </tr>
        </table>
      `;

      const html = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office'
              xmlns:w='urn:schemas-microsoft-com:office:word'
              xmlns='http://www.w3.org/TR/REC-html40'>
          <head>
            <meta charset='utf-8'>
            <title>Relieving Letter</title>
            <style>
              body { font-family: "Calibri", sans-serif; font-size: 13px; color: #000; margin: 0; padding: 0; }
              .ref-date-row { margin-bottom: 12px; }
              .dated-right { text-align: right; }
              .address-block { margin: 12px 0; line-height: 1.6; }
              .subject-line { margin: 14px 0; }
              .salutation-line { margin: 12px 0; font-weight: bold; }
              .body-para { margin-bottom: 8px; line-height: 1.5; }
              .regards { margin-top: 30px; line-height: 1.6; }
              @page WordSection1 {
                size: 21cm 29.7cm;
                margin: 40px 55px 20px 55px;
              }
              div.WordSection1 { page: WordSection1; }
            </style>
            <!--[if gte mso 9]>
            <xml>
              <w:WordDocument>
                <w:View>Print</w:View>
                <w:Zoom>100</w:Zoom>
                <w:DoNotOptimizeForBrowser/>
              </w:WordDocument>
            </xml>
            <![endif]-->
          </head>
          <body>
            <div class="WordSection1">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr><td style="height:90px;" valign="top">${headerHtml}</td></tr>
                <tr><td valign="top">${content}</td></tr>
                <tr><td style="height:420px; font-size:1px; line-height:1px;">&nbsp;</td></tr>
                <tr><td valign="top">${footerHtml}</td></tr>
              </table>
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
