import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Notyf } from 'notyf';
import { MasterService } from '../../services/master.service';
import { CompanyLogoService, DEFAULT_COMPANY_LOGO } from '../../services/company-logo.service';

@Component({
  selector: 'app-company-logo',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './company-logo.component.html',
  styleUrl: './company-logo.component.css',
})
export class CompanyLogoComponent implements OnInit {
  readonly defaultLogo = DEFAULT_COMPANY_LOGO;
  readonly maxSize = 2 * 1024 * 1024; // 2MB
  readonly allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];

  currentUrl: string | null = null;
  previewUrl: string | null = null;
  selectedFile: File | null = null;
  loading = false;
  saving = false;
  removing = false;
  private notyf = new Notyf();

  @ViewChild('fileInput') fileInput?: ElementRef<HTMLInputElement>;

  constructor(private master: MasterService, private companyLogo: CompanyLogoService) {}

  ngOnInit(): void {
    this.loading = true;
    this.master.getCompanyLogo().subscribe({
      next: (res: any) => {
        if (res?.status === true) {
          this.currentUrl = res?.data?.url || null;
          this.companyLogo.set(this.currentUrl);
        }
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (!this.allowedTypes.includes(file.type)) {
      this.notyf.error('Only PNG or JPG images are allowed.');
      input.value = '';
      return;
    }
    if (file.size > this.maxSize) {
      this.notyf.error('Maximum allowed file size is 2MB.');
      input.value = '';
      return;
    }
    this.selectedFile = file;
    const reader = new FileReader();
    reader.onload = (e) => { this.previewUrl = e.target?.result as string; };
    reader.readAsDataURL(file);
  }

  save(): void {
    if (!this.selectedFile) {
      this.notyf.error('Please select an image first.');
      return;
    }
    this.saving = true;
    this.master.uploadCompanyLogo(this.selectedFile).subscribe({
      next: (res: any) => {
        this.saving = false;
        if (res?.status === true) {
          this.currentUrl = res.data?.url || null;
          this.companyLogo.set(this.currentUrl);
          this.clearSelection();
          this.notyf.success('Company logo saved successfully.');
        } else {
          this.notyf.error(res?.message || 'Upload failed.');
        }
      },
      error: (err) => {
        this.saving = false;
        this.notyf.error(err?.error?.message || 'Failed to upload. Please try again.');
      }
    });
  }

  removeLogo(): void {
    if (!this.currentUrl) return;
    this.removing = true;
    this.master.removeCompanyLogo().subscribe({
      next: (res: any) => {
        this.removing = false;
        if (res?.status === true) {
          this.currentUrl = null;
          this.companyLogo.set(null);
          this.notyf.success('Company logo removed. The default logo will be shown.');
        } else {
          this.notyf.error(res?.message || 'Could not remove logo.');
        }
      },
      error: () => {
        this.removing = false;
        this.notyf.error('Could not remove logo. Please try again.');
      }
    });
  }

  clearSelection(): void {
    this.previewUrl = null;
    this.selectedFile = null;
    if (this.fileInput) this.fileInput.nativeElement.value = '';
  }

  onImgError(event: Event): void {
    this.companyLogo.onImgError(event);
  }
}
