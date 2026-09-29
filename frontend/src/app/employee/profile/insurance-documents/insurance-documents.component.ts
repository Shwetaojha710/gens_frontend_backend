import { CommonModule } from '@angular/common';
import { Component, ElementRef, Input, OnChanges, OnInit, SimpleChanges, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NgSelectModule } from '@ng-select/ng-select';
import { Notyf } from 'notyf';
import Swal from 'sweetalert2';
import { DomSanitizer } from '@angular/platform-browser';
import { MasterService } from '../../../services/master.service';
import { StatusService } from '../../../services/status.service';
import { DataService } from '../../../services/data.service';
import { ValidationUtil } from '../../../shared/utils/validation.util';

@Component({
  selector: 'app-insurance-documents',
  standalone: true,
  imports: [NgSelectModule, FormsModule, CommonModule],
  templateUrl: './insurance-documents.component.html',
  styleUrl: './insurance-documents.component.css',
})
export class InsuranceDocumentsComponent implements OnInit, OnChanges {
  /** Optional — when set (e.g. insurance overview page), overrides localStorage employeeId */
  @Input() employee: any = null;

  notyf = new Notyf();
  @ViewChild('fileInput') fileInput!: ElementRef;

  personalDetails: any = {};
  obj: any = {};
  DocumentList: any[] = [];
  createFlag = false;
  updateFlag = false;
  editingId: string | null = null;
  selectedFile: File | null = null;
  sanitizedImage: any = null;
  /** Raw URL/data-URL for PDF preview in new tab */
  previewSourceUrl: string | null = null;
  fileType: string | null = null;
  isFileInvalid = false;

  readonly docTypeOptions = [
    { value: 'e_insurance_card', label: 'E-Insurance Card' },
    // { value: 'insurance_policy', label: 'Insurance Policy Document' },
  ];

  readonly statusOptions = [
    { value: 'active', label: 'ACTIVE' },
    { value: 'inactive', label: 'INACTIVE' },
  ];

  constructor(
    private master: MasterService,
    public statusService: StatusService,
    private router: Router,
    public dataService: DataService,
    private sanitizer: DomSanitizer,
  ) {
    this.personalDetails = JSON.parse(localStorage.getItem('employeeId') || '{}');
  }

  ngOnInit(): void {
    this.resolveEmployee();
    this.fetchDocuments();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['employee'] && !changes['employee'].firstChange) {
      this.resolveEmployee();
      this.back();
      this.fetchDocuments();
    }
  }

  private resolveEmployee(): void {
    if (this.employee?.id) {
      this.personalDetails = this.employee;
      localStorage.setItem('employeeId', JSON.stringify(this.employee));
    } else {
      this.personalDetails = JSON.parse(localStorage.getItem('employeeId') || '{}');
    }
  }

  fetchDocuments(): void {
    this.DocumentList = [];
    if (!this.personalDetails?.id) {
      this.notyf.error('Employee not selected');
      return;
    }
    this.master.getInsuranceDocs({ employeeId: this.personalDetails.id }).subscribe({
      next: (data: any) => {
        if (data?.status === true) {
          this.DocumentList = (data.data || []).map((d: any) => ({
            ...d,
            fileUrl: this.master.getImageUrl(d.doc_name),
          }));
        } else {
          this.DocumentList = [];
          if (data?.message && !String(data.message).toLowerCase().includes('no insurance')) {
            this.notyf.error(data.message);
          }
        }
      },
      error: (err) => this.notyf.error(err?.error?.message || 'Failed to load insurance documents'),
    });
  }

  opencreate(): void {
    this.obj = { insuranceDocType: null, status: 'active' };
    this.createFlag = true;
    this.updateFlag = false;
    this.editingId = null;
    this.selectedFile = null;
    this.sanitizedImage = null;
    this.previewSourceUrl = null;
    this.fileType = null;
  }

  back(): void {
    this.createFlag = false;
    this.updateFlag = false;
    this.obj = {};
    this.editingId = null;
    this.closeFile();
  }

  onFileChange(event: any): void {
    const file = event.target.files?.[0];
    if (!file) {
      this.isFileInvalid = true;
      return;
    }
    const allowed = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
    if (!allowed.includes(file.type)) {
      this.isFileInvalid = true;
      this.selectedFile = null;
      this.fileInput.nativeElement.value = '';
      this.notyf.error('Only PDF and image files (PNG/JPG) are allowed.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      this.notyf.error('File size must be under 10 MB.');
      this.fileInput.nativeElement.value = '';
      return;
    }
    this.isFileInvalid = false;
    this.selectedFile = file;
    this.fileType = file.type;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      this.previewSourceUrl = dataUrl;
      if (file.type === 'application/pdf') {
        this.sanitizedImage = this.sanitizer.bypassSecurityTrustResourceUrl(dataUrl);
      } else {
        this.sanitizedImage = this.sanitizer.bypassSecurityTrustUrl(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  }

  closeFile(): void {
    this.sanitizedImage = null;
    this.previewSourceUrl = null;
    this.selectedFile = null;
    this.isFileInvalid = false;
    this.fileType = null;
    if (this.fileInput?.nativeElement) {
      this.fileInput.nativeElement.value = '';
    }
  }

  /** Open PDF / image in a new browser tab (native PDF reader) */
  openSelectedPreview(): void {
    if (!this.previewSourceUrl && !this.sanitizedImage) {
      this.notyf.error('No file to preview');
      return;
    }
    const url = this.previewSourceUrl || (typeof this.sanitizedImage === 'string' ? this.sanitizedImage : '');
    this.openPdfReader(url);
  }

  /** Open saved list item in a new browser tab */
  openListPreview(item: any): void {
    if (!item?.fileUrl) {
      this.notyf.error('File URL missing');
      return;
    }
    this.openPdfReader(item.fileUrl);
  }

  /** Download list file (force download, not just open) */
  async downloadListFile(item: any): Promise<void> {
    const url = item?.fileUrl;
    if (!url) {
      this.notyf.error('File URL missing');
      return;
    }
    const filename =
      item.originalName ||
      item.doc_name ||
      (item.doc_type?.includes('pdf') ? 'insurance-document.pdf' : 'insurance-document');
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(a.href);
    } catch {
      // Fallback: open URL (browser may download or preview)
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
  }

  openPdfReader(url: string): void {
    if (!url && !this.selectedFile) {
      this.notyf.error('File URL missing');
      return;
    }
    // Prefer blob URL for just-selected files (more reliable than huge data: URLs)
    let openUrl = url;
    if (this.selectedFile && (!url || url.startsWith('data:'))) {
      openUrl = URL.createObjectURL(this.selectedFile);
    }
    if (!openUrl) {
      this.notyf.error('File URL missing');
      return;
    }
    // Do NOT pass 'noopener' as features — browsers then return null even when the tab opens,
    // which falsely triggers a "popup blocked" message.
    const win = window.open(openUrl, '_blank');
    if (win) {
      try {
        win.opener = null;
      } catch {
        /* ignore */
      }
    } else {
      // Fallback: same-tab navigation if popup really blocked
      const a = document.createElement('a');
      a.href = openUrl;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
  }

  onSubmit(): void {
    if (!ValidationUtil.showRequiredError('Document type', this.obj.insuranceDocType, this.notyf)) {
      return;
    }
    if (!this.selectedFile) {
      this.notyf.error('Select a file to upload');
      return;
    }
    const fd = new FormData();
    fd.append('employeeId', this.personalDetails.id);
    fd.append('insuranceDocType', this.obj.insuranceDocType);
    fd.append('status', this.obj.status || 'active');
    fd.append('doc_name', this.selectedFile, this.selectedFile.name);

    this.master.upsertInsuranceDoc(fd).subscribe({
      next: (response: any) => {
        const message = response.message || 'Uploaded successfully';
        const status = this.statusService.handleResponseStatus(response.status, message);
        if (status === true) {
          this.notyf.success(message);
          this.fetchDocuments();
          this.back();
        } else if (status === 'expired') {
          this.router.navigate(['login']);
        } else {
          this.notyf.error(message);
        }
      },
      error: (err) => this.notyf.error(err?.error?.message || 'Upload failed'),
    });
  }

  update(item: any): void {
    this.obj = {
      id: item.id,
      insuranceDocType: item.insuranceDocType,
      status: item.status || 'active',
      doc_name: item.fileUrl,
      doc_type: item.doc_type,
      originalName: item.originalName,
    };
    this.editingId = item.id;
    this.createFlag = true;
    this.updateFlag = true;
    this.selectedFile = null;
    this.fileType = item.doc_type;
    this.previewSourceUrl = item.fileUrl;
    if (item.doc_type?.startsWith('image/')) {
      this.sanitizedImage = this.sanitizer.bypassSecurityTrustUrl(item.fileUrl);
    } else {
      this.sanitizedImage = this.sanitizer.bypassSecurityTrustResourceUrl(item.fileUrl);
      this.fileType = item.doc_type || 'application/pdf';
    }
  }

  updatedata(): void {
    if (!ValidationUtil.showRequiredError('Document type', this.obj.insuranceDocType, this.notyf)) {
      return;
    }
    if (!this.selectedFile) {
      this.notyf.error('Select a new file to replace the existing document');
      return;
    }
    const fd = new FormData();
    fd.append('employeeId', this.personalDetails.id);
    fd.append('insuranceDocType', this.obj.insuranceDocType);
    fd.append('status', this.obj.status || 'active');
    fd.append('doc_name', this.selectedFile, this.selectedFile.name);

    this.master.upsertInsuranceDoc(fd).subscribe({
      next: (response: any) => {
        const message = response.message || 'Updated successfully';
        const status = this.statusService.handleResponseStatus(response.status, message);
        if (status === true) {
          this.notyf.success(message);
          this.fetchDocuments();
          this.back();
        } else if (status === 'expired') {
          this.router.navigate(['login']);
        } else {
          this.notyf.error(message);
        }
      },
      error: (err) => this.notyf.error(err?.error?.message || 'Update failed'),
    });
  }

  delete(item: any): void {
    Swal.fire({
      title: 'Are you sure?',
      text: 'Do you want to delete this insurance document?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'No, cancel!',
      reverseButtons: true,
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.master
        .deleteInsuranceDoc({ id: item.id, employeeId: this.personalDetails.id })
        .subscribe({
          next: (response: any) => {
            const message = response.message || 'Deleted successfully';
            const status = this.statusService.handleResponseStatus(response.status, message);
            if (status === true) {
              this.notyf.success(message);
              this.fetchDocuments();
            } else if (status === 'expired') {
              this.router.navigate(['login']);
            } else {
              this.notyf.error(message);
            }
          },
          error: (err) => this.notyf.error(err?.error?.message || 'Delete failed'),
        });
    });
  }
}
