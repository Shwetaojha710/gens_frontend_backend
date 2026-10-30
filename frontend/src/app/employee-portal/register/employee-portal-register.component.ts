import { Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Notyf } from 'notyf';
import { Subscription } from 'rxjs';
import { EmployeePortalService } from '../services/employee-portal.service';

@Component({
  selector: 'app-employee-portal-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './employee-portal-register.component.html',
  styleUrls: [
    './employee-portal-register.component.css',
    '../login/employee-portal-login.component.css',
    '../../login/login.component.css',
  ],
})
export class EmployeePortalRegisterComponent implements OnDestroy {
  @ViewChild('cameraVideo') cameraVideo?: ElementRef<HTMLVideoElement>;

  form: FormGroup;
  loading = false;
  verifyingTenant = false;
  tenantVerified = false;
  verifiedCompanyName = '';
  tenantError = '';
  profileFile: File | null = null;
  profilePreview: string | null = null;

  cameraOpen = false;
  cameraStarting = false;
  cameraError = '';
  private stream: MediaStream | null = null;

  private notyf = new Notyf();
  private subs = new Subscription();
  private lastVerifiedCode = '';

  readonly genders = [
    { value: 'Male', label: 'Male' },
    { value: 'Female', label: 'Female' },
    { value: 'Other', label: 'Other' },
  ];

  private readonly photoMinBytes = 20 * 1024;
  private readonly photoMaxBytes = 2 * 1024 * 1024;
  private readonly passportRatio = 35 / 45;
  private readonly captureOutW = 450;
  private readonly captureOutH = 579; // 450 / (35/45)

  constructor(
    private fb: FormBuilder,
    private api: EmployeePortalService,
    private router: Router,
  ) {
    this.form = this.fb.group({
      companyCode: ['', Validators.required],
      firstName: ['', [Validators.required, Validators.maxLength(60)]],
      lastName: ['', [Validators.required, Validators.maxLength(60)]],
      mobile: ['', [Validators.required, Validators.pattern(/^[6-9]\d{9}$/)]],
      email: ['', [Validators.email]],
      dateOfBirth: ['', Validators.required],
      age: [{ value: '', disabled: true }],
      gender: ['', Validators.required],
    });

    this.subs.add(
      this.form.get('dateOfBirth')!.valueChanges.subscribe((v) => {
        this.form.get('age')?.setValue(this.ageFromDob(v), { emitEvent: false });
      }),
    );

    this.subs.add(
      this.form.get('companyCode')!.valueChanges.subscribe((v) => {
        const code = String(v || '').trim();
        if (code.toLowerCase() !== this.lastVerifiedCode.toLowerCase()) {
          this.resetTenantVerify();
        }
      }),
    );
  }

  ngOnDestroy(): void {
    this.stopCamera();
    this.subs.unsubscribe();
  }

  isInvalid(name: string): boolean {
    const c = this.form.get(name);
    return !!c && c.invalid && (c.dirty || c.touched);
  }

  onCompanyCodeBlur(): void {
    const code = String(this.form.get('companyCode')?.value || '').trim();
    if (!code) return;
    if (this.tenantVerified && code.toLowerCase() === this.lastVerifiedCode.toLowerCase()) {
      return;
    }
    this.verifyCompanyCode();
  }

  verifyCompanyCode(): void {
    const ctrl = this.form.get('companyCode');
    const code = String(ctrl?.value || '').trim();
    if (!code) {
      ctrl?.markAsTouched();
      this.tenantError = 'Company code is required.';
      this.tenantVerified = false;
      return;
    }

    this.verifyingTenant = true;
    this.tenantError = '';
    this.api.checkTenant(code).subscribe({
      next: (res) => {
        this.verifyingTenant = false;
        const ok = res?.status === true || res?.status === 'success';
        if (ok && res?.data) {
          this.tenantVerified = true;
          this.lastVerifiedCode = code;
          this.verifiedCompanyName = res.data.companyName || code;
          this.tenantError = '';
          this.form.get('companyCode')?.setValue(code, { emitEvent: false });
        } else {
          this.resetTenantVerify();
          this.tenantError = res?.message || 'No company found for this code.';
        }
      },
      error: (err) => {
        this.verifyingTenant = false;
        this.resetTenantVerify();
        this.tenantError =
          err?.error?.message || err?.message || 'Could not verify company code.';
      },
    });
  }

  private resetTenantVerify(): void {
    this.tenantVerified = false;
    this.verifiedCompanyName = '';
    this.lastVerifiedCode = '';
    this.tenantError = '';
  }

  onPhoneInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value.replace(/\D/g, '').slice(0, 10);
    input.value = value;
    this.form.get('mobile')?.setValue(value);
  }

  onDobChange(): void {
    const v = this.form.get('dateOfBirth')?.value;
    this.form.get('age')?.setValue(this.ageFromDob(v), { emitEvent: false });
  }

  private ageFromDob(isoDate: string): number | '' {
    if (!isoDate) return '';
    const d = new Date(isoDate);
    if (Number.isNaN(d.getTime())) return '';
    const today = new Date();
    let age = today.getFullYear() - d.getFullYear();
    const m = today.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age -= 1;
    return age >= 0 && age < 120 ? age : '';
  }

  private toAppDate(iso: string): string {
    if (!iso || !/^\d{4}-\d{2}-\d{2}/.test(iso)) return iso || '';
    const [y, m, d] = iso.slice(0, 10).split('-');
    return `${d}/${m}/${y}`;
  }

  async openCamera(): Promise<void> {
    if (!navigator.mediaDevices?.getUserMedia) {
      this.notyf.error('Camera is not supported in this browser.');
      return;
    }
    this.cameraError = '';
    this.cameraOpen = true;
    this.cameraStarting = true;
    try {
      this.stopCameraTracksOnly();
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      // Wait for *ngIf video to render
      await new Promise((r) => setTimeout(r, 50));
      const video = this.cameraVideo?.nativeElement;
      if (!video) {
        throw new Error('Camera view not ready');
      }
      video.srcObject = this.stream;
      await video.play();
      this.cameraStarting = false;
    } catch (err: unknown) {
      this.cameraStarting = false;
      this.stopCamera();
      const name = (err as { name?: string })?.name || '';
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        this.cameraError = 'Camera permission denied. Please allow camera access to continue.';
      } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        this.cameraError = 'No camera found on this device.';
      } else {
        this.cameraError = 'Could not open camera. Please try again.';
      }
      this.notyf.error(this.cameraError);
    }
  }

  closeCamera(): void {
    this.stopCamera();
  }

  private stopCameraTracksOnly(): void {
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    const video = this.cameraVideo?.nativeElement;
    if (video) {
      video.srcObject = null;
    }
  }

  private stopCamera(): void {
    this.stopCameraTracksOnly();
    this.cameraOpen = false;
    this.cameraStarting = false;
  }

  capturePhoto(): void {
    const video = this.cameraVideo?.nativeElement;
    if (!video || !this.stream || video.readyState < 2) {
      this.notyf.error('Camera is not ready yet. Please wait a moment.');
      return;
    }

    const vw = video.videoWidth;
    const vh = video.videoHeight;
    if (!vw || !vh) {
      this.notyf.error('Camera frame not available. Try again.');
      return;
    }

    // Center-crop to passport aspect (35:45)
    let cropW = vw;
    let cropH = Math.round(cropW / this.passportRatio);
    if (cropH > vh) {
      cropH = vh;
      cropW = Math.round(cropH * this.passportRatio);
    }
    const sx = Math.floor((vw - cropW) / 2);
    const sy = Math.floor((vh - cropH) / 2);

    const canvas = document.createElement('canvas');
    canvas.width = this.captureOutW;
    canvas.height = this.captureOutH;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      this.notyf.error('Could not capture photo.');
      return;
    }
    ctx.drawImage(video, sx, sy, cropW, cropH, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          this.notyf.error('Could not capture photo. Try again.');
          return;
        }
        const file = new File([blob], `live-photo-${Date.now()}.jpg`, {
          type: 'image/jpeg',
        });
        if (blob.size < this.photoMinBytes) {
          this.notyf.error('Photo quality is too low. Improve lighting and capture again.');
          return;
        }
        if (blob.size > this.photoMaxBytes) {
          this.notyf.error('Captured photo is too large. Try again.');
          return;
        }
        this.profileFile = file;
        const reader = new FileReader();
        reader.onload = () => (this.profilePreview = reader.result as string);
        reader.readAsDataURL(file);
        this.stopCamera();
        this.notyf.success('Photo captured.');
      },
      'image/jpeg',
      0.88,
    );
  }

  clearProfile(): void {
    this.profileFile = null;
    this.profilePreview = null;
  }

  submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.notyf.error('Please fill all required fields.');
      return;
    }
    if (!this.tenantVerified) {
      this.verifyCompanyCode();
      this.notyf.error('Please verify a valid company code first.');
      return;
    }
    if (!this.profileFile) {
      this.notyf.error('Please capture a live photo for your profile.');
      return;
    }

    const raw = this.form.getRawValue();
    const fd = new FormData();
    fd.append('companyCode', String(raw.companyCode || '').trim());
    fd.append('firstName', String(raw.firstName || '').trim());
    fd.append('lastName', String(raw.lastName || '').trim());
    fd.append('mobile', String(raw.mobile || '').trim());
    fd.append('email', String(raw.email || '').trim());
    fd.append('dateOfBirth', this.toAppDate(String(raw.dateOfBirth || '')));
    fd.append('age', String(raw.age || this.ageFromDob(raw.dateOfBirth) || 18));
    fd.append('gender', String(raw.gender || '').trim());
    fd.append('profileImage', this.profileFile, this.profileFile.name);

    this.loading = true;
    this.api.registerAppEmp(fd).subscribe({
      next: (res) => {
        this.loading = false;
        if (res?.status === true || res?.status === 'success') {
          this.notyf.success(res.message || 'Registration successful.');
          this.router.navigate(['/employee-portal/login']);
        } else {
          this.notyf.error(res?.message || 'Registration failed.');
        }
      },
      error: (err) => {
        this.loading = false;
        const msg =
          err?.error?.message || err?.message || 'Registration failed. Please try again.';
        this.notyf.error(msg);
      },
    });
  }
}
