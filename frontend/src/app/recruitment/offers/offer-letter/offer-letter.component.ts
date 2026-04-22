import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Notyf } from 'notyf';
import { JobService } from '../../../services/job.service';
import { StatusService } from '../../../services/status.service';
import { SearchPaginationComponent } from '../../../master/search-pagination/search-pagination.component';

@Component({
  selector: 'app-recruitment-offer-letter',
  standalone: true,
  imports: [CommonModule, FormsModule, SearchPaginationComponent],
  templateUrl: './offer-letter.component.html',
  styleUrl: './offer-letter.component.css'
})
export class RecruitmentOfferLetterComponent implements OnInit {
  notyf = new Notyf();
  isDownload = false;
  isSaving = false;
  letterheadImage = '/assets/img/Letterhead-2.png';
  aadhaarError = '';

  tenant: any = {};

  branchOffices = ['Lucknow', 'Jaunpur', 'Kanpur', 'Varanasi'];

  details: any = {
    firstName: '',
    lastName: '',
    fatherName: '',
    gender: 'Male',
    dob: '',
    aadhaarNo: '',
    mobileNo: '',
    email: '',
    permanentAddress: '',
    designation: '',
    department: '',
    headOffice: '',
    joiningDate: '',
    refNo: '',
    offerDate: ''
  };

  errors: any = {
    mobileNo: '',
    email: '',
    designation: '',
    department: ''
  };

  offerLetterList: any[] = [];
  displayList: any[] = [];
  isLoadingList = false;
  showForm = false;
  searchTerm = '';
  currentPage = 1;
  itemsPerPage = 10;
  totalItems = 0;

  constructor(
    private jobService: JobService,
    private statusService: StatusService,
    private router: Router
  ) {
    this.tenant = JSON.parse(localStorage.getItem('tenant') || '{}');
  }

  ngOnInit(): void {
    this.getBase64ImageFromUrl('/assets/img/Letterhead-2.png')
      .then(base64 => { this.letterheadImage = base64; })
      .catch(() => {});
    this.loadOfferLetterList();
  }

  onAadhaarInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    let raw = input.value.replace(/\D/g, '').slice(0, 12);
    const formatted = raw.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
    this.details.aadhaarNo = formatted;
    input.value = formatted;
    this.validateAadhaar();
  }

  validateMobile(): boolean {
    const m = this.details.mobileNo.trim();
    if (!m) { this.errors.mobileNo = 'Mobile number is required.'; return false; }
    if (!/^[6-9]\d{9}$/.test(m)) {
      this.errors.mobileNo = 'Enter a valid 10-digit mobile number (starts with 6-9).';
      return false;
    }
    this.errors.mobileNo = '';
    return true;
  }

  validateEmail(): boolean {
    const e = this.details.email.trim();
    if (!e) { this.errors.email = 'Email is required.'; return false; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
      this.errors.email = 'Enter a valid email address.';
      return false;
    }
    this.errors.email = '';
    return true;
  }

  validateDesignation(): boolean {
    const val = this.details.designation.trim();
    if (!val) { this.errors.designation = 'Designation is required.'; return false; }
    if (val.length < 2) { this.errors.designation = 'Designation must be at least 2 characters.'; return false; }
    this.errors.designation = '';
    return true;
  }

  validateDepartment(): boolean {
    const val = this.details.department.trim();
    if (!val) { this.errors.department = 'Department is required.'; return false; }
    if (val.length < 2) { this.errors.department = 'Department must be at least 2 characters.'; return false; }
    this.errors.department = '';
    return true;
  }

  validateAadhaar(): boolean {
    const digits = this.details.aadhaarNo.replace(/\s/g, '');
    if (digits.length === 0) {
      this.aadhaarError = '';
      return true;
    }
    if (digits.length !== 12) {
      this.aadhaarError = 'Aadhaar number must be exactly 12 digits.';
      return false;
    }
    if (/^[0-1]/.test(digits)) {
      this.aadhaarError = 'Aadhaar number cannot start with 0 or 1.';
      return false;
    }
    this.aadhaarError = '';
    return true;
  }

  maskAadhaar(value: string): string {
    const digits = value ? value.replace(/ /g, '') : '';
    return digits.length >= 4 ? 'XXXX XXXX ' + digits.slice(-4) : '—';
  }

  loadOfferLetterList(): void {
    this.isLoadingList = true;
    this.jobService.getRecruitmentOfferLetters().subscribe({
      next: (res: any) => {
        this.offerLetterList = res.status ? (res.data || []) : [];
        this.applyFilter();
        this.isLoadingList = false;
      },
      error: () => { this.isLoadingList = false; }
    });
  }

  onSearch(term: string): void {
    this.searchTerm = term.toLowerCase();
    this.currentPage = 1;
    this.applyFilter();
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.applyFilter();
  }

  onPageSizeChange(size: number): void {
    this.itemsPerPage = size;
    this.currentPage = 1;
    this.applyFilter();
  }

  private applyFilter(): void {
    let data = [...this.offerLetterList];
    if (this.searchTerm) {
      data = data.filter(item =>
        `${item.firstName} ${item.lastName} ${item.email} ${item.mobileNo} ${item.designation} ${item.department}`
          .toLowerCase().includes(this.searchTerm)
      );
    }
    this.totalItems = data.length;
    const start = (this.currentPage - 1) * this.itemsPerPage;
    this.displayList = data.slice(start, start + this.itemsPerPage);
  }

  onLetterheadUpload(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const reader = new FileReader();
    reader.onload = (e) => { this.letterheadImage = e.target?.result as string; };
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

  formatOrdinalDateHtml(value: string | null | undefined): string {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const day = date.getDate();
    const month = date.toLocaleString('en-US', { month: 'long' });
    const year = date.getFullYear();
    return `${day}<sup>${this.getOrdinalSuffix(day)}</sup> ${month}, ${year}`;
  }

  private getOrdinalSuffix(day: number): string {
    if (day >= 11 && day <= 13) return 'TH';
    switch (day % 10) {
      case 1: return 'ST';
      case 2: return 'ND';
      case 3: return 'RD';
      default: return 'TH';
    }
  }

  isFormValid(): boolean {
    const d = this.details;
    return !!(d.firstName && d.lastName && d.fatherName && d.gender &&
              d.mobileNo && d.email && d.permanentAddress &&
              d.designation && d.department && d.joiningDate && d.offerDate);
  }

  saveOfferLetter(): void {
    const mobileOk = this.validateMobile();
    const emailOk = this.validateEmail();
    const designationOk = this.validateDesignation();
    const departmentOk = this.validateDepartment();
    const aadhaarOk = this.validateAadhaar();

    if (!this.isFormValid() || !mobileOk || !emailOk || !designationOk || !departmentOk || !aadhaarOk) {
      this.notyf.error('Please fix validation errors before saving.');
      return;
    }
    this.isSaving = true;
    this.jobService.saveRecruitmentOfferLetter({ ...this.details, tenantId: this.tenant?.id }).subscribe({
      next: (res: any) => {
        const status = this.statusService.handleResponseStatus(res.status, 'OK');
        if (status === true) {
          this.notyf.success('Offer letter saved successfully.');
          this.showForm = false;
          this.loadOfferLetterList();
        } else if (status === 'expired') {
          this.router.navigate(['/login']);
        } else {
          this.notyf.error('Failed to save offer letter.');
        }
        this.isSaving = false;
      },
      error: () => {
        this.notyf.error('Server error. Please try again.');
        this.isSaving = false;
      }
    });
  }

  printDoc(): void {
    if (!this.isFormValid()) {
      this.notyf.error('Please fill all required fields.');
      return;
    }
    this.isDownload = true;
    this.getBase64ImageFromUrl('/assets/img/Letterhead-2.png').then(bgImage => {
      const element = document.getElementById('offer-doc');
      if (!element) { this.isDownload = false; return; }
      const content = element.outerHTML;
      const printWindow = window.open('', '_blank', 'width=900,height=700');
      if (!printWindow) { this.isDownload = false; return; }
      printWindow.document.write(`<!DOCTYPE html>
        <html><head><title>Offer Letter</title><style>
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; box-sizing: border-box; }
          body { margin: 0; font-family: 'Calibri (Body)'; }
          #offer-doc { width: 21cm; min-height: 29.7cm; padding: 20px 60px; position: relative;
            background-image: url('${bgImage}'); background-repeat: no-repeat; background-size: 100% 100%; }
          input { border: none; outline: none; background: transparent; font-family: 'Calibri (Body)'; font-size: 11px; }
          @media print { body { margin: 0; } @page { margin: 0; size: A4; } }
        </style></head><body>${content}</body></html>`);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => { printWindow.print(); this.isDownload = false; }, 500);
    }).catch(() => { this.isDownload = false; });
  }

  async downloadPDF(): Promise<void> {
    if (!this.isFormValid()) {
      this.notyf.error('Please fill all required fields.');
      return;
    }
    this.isDownload = true;
    await new Promise(resolve => setTimeout(resolve, 1000));
    const bgImage = await this.getBase64ImageFromUrl('/assets/img/Letterhead-2.png');
    const element = document.getElementById('offer-doc');
    if (!element) { this.isDownload = false; return; }
    const cloned = element.cloneNode(true) as HTMLElement;
    cloned.style.cssText = `width:21cm; min-height:29.5cm; padding:100px 60px; position:relative;
      background-image:url(${bgImage}); background-repeat:no-repeat;
      background-size:100% 100%; box-sizing:border-box;`;
    const html2pdfModule = await import('html2pdf.js');
    const html2pdf = (html2pdfModule as any).default || html2pdfModule;
    const opt = {
      margin: [0, 0, 0, 0],
      filename: `OfferLetter_${this.details.firstName || 'Candidate'}.pdf`,
      image: { type: 'jpeg', quality: 1 },
      html2canvas: { scale: 2, useCORS: true, allowTaint: true, logging: false },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(cloned).save().then(() => { this.isDownload = false; });
  }
}
