import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Notyf } from 'notyf';
import { MasterService } from '../../services/master.service';
import { CompanyLogoService, CompanyLogoVariant, DEFAULT_COMPANY_LOGO } from '../../services/company-logo.service';

interface LogoSlot {
  variant: CompanyLogoVariant;
  title: string;
  hint: string;
  currentUrl: string | null;
  previewUrl: string | null;
  selectedFile: File | null;
  saving: boolean;
  removing: boolean;
}

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

  loading = false;
  private notyf = new Notyf();

  slots: Record<CompanyLogoVariant, LogoSlot> = {
    light: {
      variant: 'light',
      title: 'Company Logo',
      hint: 'Used on white backgrounds: letters, payslips, PDFs and the profile avatar.',
      currentUrl: null, previewUrl: null, selectedFile: null, saving: false, removing: false,
    },
    dark: {
      variant: 'dark',
      title: 'Logo for Dark Backgrounds',
      hint: 'Optional. Used on the dark sidebar (e.g. a white logo). If not set, the company logo is used.',
      currentUrl: null, previewUrl: null, selectedFile: null, saving: false, removing: false,
    },
  };

  readonly slotOrder: CompanyLogoVariant[] = ['light', 'dark'];

  constructor(private master: MasterService, private companyLogo: CompanyLogoService) {}

  ngOnInit(): void {
    this.loading = true;
    this.master.getCompanyLogo().subscribe({
      next: (res: any) => {
        if (res?.status === true) this.applyServerLogos(res.data);
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  /** What each preview shows: new pick, saved logo, or what the app falls back to. */
  shownLogo(slot: LogoSlot): string {
    if (slot.previewUrl) return slot.previewUrl;
    if (slot.currentUrl) return slot.currentUrl;
    return this.otherSlot(slot).currentUrl || this.defaultLogo;
  }

  fallbackLabel(slot: LogoSlot): string {
    if (this.otherSlot(slot).currentUrl) {
      return slot.variant === 'light' ? 'Using dark logo' : 'Using company logo';
    }
    return 'Default logo';
  }

  onFileChange(event: Event, slot: LogoSlot): void {
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
    slot.selectedFile = file;
    const reader = new FileReader();
    reader.onload = (e) => { slot.previewUrl = e.target?.result as string; };
    reader.readAsDataURL(file);
    input.value = '';
  }

  save(slot: LogoSlot): void {
    if (!slot.selectedFile) {
      this.notyf.error('Please select an image first.');
      return;
    }
    slot.saving = true;
    this.master.uploadCompanyLogo(slot.selectedFile, slot.variant).subscribe({
      next: (res: any) => {
        slot.saving = false;
        if (res?.status === true) {
          this.applyServerLogos(res.data);
          this.clearSelection(slot);
          this.notyf.success('Logo saved successfully.');
        } else {
          this.notyf.error(res?.message || 'Upload failed.');
        }
      },
      error: (err) => {
        slot.saving = false;
        this.notyf.error(err?.error?.message || 'Failed to upload. Please try again.');
      }
    });
  }

  removeLogo(slot: LogoSlot): void {
    if (!slot.currentUrl) return;
    slot.removing = true;
    this.master.removeCompanyLogo(slot.variant).subscribe({
      next: (res: any) => {
        slot.removing = false;
        if (res?.status === true) {
          this.applyServerLogos(res.data);
          this.notyf.success('Logo removed.');
        } else {
          this.notyf.error(res?.message || 'Could not remove logo.');
        }
      },
      error: () => {
        slot.removing = false;
        this.notyf.error('Could not remove logo. Please try again.');
      }
    });
  }

  clearSelection(slot: LogoSlot): void {
    slot.previewUrl = null;
    slot.selectedFile = null;
  }

  onImgError(event: Event): void {
    this.companyLogo.onImgError(event);
  }

  private otherSlot(slot: LogoSlot): LogoSlot {
    return this.slots[slot.variant === 'light' ? 'dark' : 'light'];
  }

  private applyServerLogos(data: any): void {
    this.slots.light.currentUrl = data?.url || null;
    this.slots.dark.currentUrl = data?.darkUrl || null;
    this.companyLogo.setLogos({ light: this.slots.light.currentUrl, dark: this.slots.dark.currentUrl });
  }
}
