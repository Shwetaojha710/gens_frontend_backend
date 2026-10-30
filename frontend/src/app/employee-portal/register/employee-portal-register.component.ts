import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
} from '@angular/core';
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
  cameraReady = false;
  cameraError = '';
  /** After Capture: show still + Submit before applying to form. */
  captureReview = false;
  pendingPreview: string | null = null;
  private pendingFile: File | null = null;
  private stream: MediaStream | null = null;
  /** Stable ref — ViewChild can lag behind *ngIf. */
  private videoEl: HTMLVideoElement | null = null;
  capturing = false;
  private readonly photoCaptureMinBytes = 5 * 1024;

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
    private cdr: ChangeDetectorRef,
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
    if (!window.isSecureContext && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
      this.notyf.error('Camera needs HTTPS (or localhost). Open the app securely and try again.');
      return;
    }

    this.cameraError = '';
    this.clearPendingCapture();
    this.captureReview = false;
    this.cameraReady = false;
    this.capturing = false;
    this.cameraOpen = true;
    this.cameraStarting = true;
    this.cdr.detectChanges();

    try {
      this.stopCameraTracksOnly();
      this.stream = await this.requestCameraStream();

      const video = await this.waitForVideoEl();
      this.videoEl = video;
      video.muted = true;
      video.autoplay = true;
      video.playsInline = true;
      video.setAttribute('playsinline', 'true');
      video.setAttribute('webkit-playsinline', 'true');
      video.srcObject = this.stream;

      // Play after metadata — more reliable on mobile Chrome/WebView
      await new Promise<void>((resolve) => {
        const go = () => resolve();
        if (video.readyState >= 1) go();
        else video.addEventListener('loadedmetadata', go, { once: true });
        setTimeout(go, 1500);
      });

      try {
        await video.play();
      } catch {
        /* autoplay policies — muted + playsinline usually OK */
      }

      await this.waitForVideoFrame(video);

      this.cameraStarting = false;
      this.cameraReady = true;
      this.cdr.detectChanges();
    } catch (err: unknown) {
      this.cameraStarting = false;
      this.cameraReady = false;
      this.stopCamera();
      const name = (err as { name?: string })?.name || '';
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        this.cameraError = 'Camera permission denied. Please allow camera access to continue.';
      } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        this.cameraError = 'No camera found on this device.';
      } else if (String((err as Error)?.message || '').includes('secure')) {
        this.cameraError = 'Camera needs HTTPS. Please use a secure link.';
      } else {
        this.cameraError = 'Could not open camera. Please try again.';
      }
      this.notyf.error(this.cameraError);
    }
  }

  private async requestCameraStream(): Promise<MediaStream> {
    const attempts: MediaStreamConstraints[] = [
      { audio: false, video: true },
      { audio: false, video: { facingMode: 'user' } },
      {
        audio: false,
        video: {
          facingMode: { ideal: 'user' },
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
      },
    ];
    let lastErr: unknown;
    for (const constraints of attempts) {
      try {
        return await navigator.mediaDevices.getUserMedia(constraints);
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr || new Error('getUserMedia failed');
  }

  private async waitForVideoEl(timeoutMs = 4000): Promise<HTMLVideoElement> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      this.cdr.detectChanges();
      const el = this.cameraVideo?.nativeElement;
      if (el) return el;
      await new Promise((r) => setTimeout(r, 50));
    }
    throw new Error('Camera view not ready');
  }

  private async waitForVideoFrame(video: HTMLVideoElement, timeoutMs = 10000): Promise<void> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      if (video.videoWidth >= 2 && video.videoHeight >= 2) return;
      await new Promise((r) => setTimeout(r, 100));
    }
    // Don't hard-fail — Capture will wait / use ImageCapture fallback
    console.warn('video dimensions still 0 after wait; enabling capture anyway');
  }

  closeCamera(): void {
    this.clearPendingCapture();
    this.stopCamera();
  }

  private clearPendingCapture(): void {
    this.pendingFile = null;
    this.pendingPreview = null;
    this.captureReview = false;
  }

  private stopCameraTracksOnly(): void {
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    if (this.videoEl) {
      this.videoEl.srcObject = null;
    }
    const video = this.cameraVideo?.nativeElement;
    if (video && video !== this.videoEl) {
      video.srcObject = null;
    }
  }

  private stopCamera(): void {
    this.stopCameraTracksOnly();
    this.videoEl = null;
    this.cameraOpen = false;
    this.cameraStarting = false;
    this.cameraReady = false;
    this.capturing = false;
    this.captureReview = false;
  }

  async capturePhoto(event?: Event): Promise<void> {
    event?.preventDefault();
    event?.stopPropagation();
    if (this.capturing) return;

    this.capturing = true;
    this.cdr.detectChanges();

    try {
      const video = this.videoEl || this.cameraVideo?.nativeElement;
      if (!video || !this.stream) {
        this.notyf.error('Camera is not ready yet. Please wait a moment.');
        return;
      }

      // Poll briefly — dimensions often appear a beat after UI says ready
      let vw = video.videoWidth;
      let vh = video.videoHeight;
      for (let i = 0; i < 25 && (vw < 2 || vh < 2); i++) {
        await new Promise((r) => setTimeout(r, 80));
        vw = video.videoWidth;
        vh = video.videoHeight;
      }

      const canvas = document.createElement('canvas');
      canvas.width = this.captureOutW;
      canvas.height = this.captureOutH;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        this.notyf.error('Could not capture photo.');
        return;
      }

      if (vw >= 2 && vh >= 2) {
        let cropW = vw;
        let cropH = Math.round(cropW / this.passportRatio);
        if (cropH > vh) {
          cropH = vh;
          cropW = Math.round(cropH * this.passportRatio);
        }
        const sx = Math.max(0, Math.floor((vw - cropW) / 2));
        const sy = Math.max(0, Math.floor((vh - cropH) / 2));
        cropW = Math.max(1, Math.min(cropW, vw - sx));
        cropH = Math.max(1, Math.min(cropH, vh - sy));
        ctx.drawImage(video, sx, sy, cropW, cropH, 0, 0, canvas.width, canvas.height);
      } else {
        // Fallback: ImageCapture API / full-element draw
        const track = this.stream.getVideoTracks()[0];
        const IC = (window as unknown as { ImageCapture?: new (t: MediaStreamTrack) => { grabFrame: () => Promise<ImageBitmap> } }).ImageCapture;
        if (track && IC) {
          try {
            const bitmap = await new IC(track).grabFrame();
            const bw = bitmap.width;
            const bh = bitmap.height;
            let cropW = bw;
            let cropH = Math.round(cropW / this.passportRatio);
            if (cropH > bh) {
              cropH = bh;
              cropW = Math.round(cropH * this.passportRatio);
            }
            const sx = Math.max(0, Math.floor((bw - cropW) / 2));
            const sy = Math.max(0, Math.floor((bh - cropH) / 2));
            ctx.drawImage(bitmap, sx, sy, cropW, cropH, 0, 0, canvas.width, canvas.height);
            bitmap.close?.();
          } catch {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          }
        } else {
          // Last resort — may be blank but avoids hard "not ready" dead-end
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        }
      }

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.88),
      );

      if (!blob) {
        this.notyf.error('Could not capture photo. Try again.');
        return;
      }
      if (blob.size < this.photoCaptureMinBytes) {
        this.notyf.error(
          'Camera feed looks blank. Allow camera permission, use HTTPS/localhost, then try again.',
        );
        return;
      }
      if (blob.size > this.photoMaxBytes) {
        this.notyf.error('Captured photo is too large. Try again.');
        return;
      }

      const file = new File([blob], `live-photo-${Date.now()}.jpg`, {
        type: 'image/jpeg',
      });
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
      });

      this.pendingFile = file;
      this.pendingPreview = dataUrl;
      this.captureReview = true;
      this.stopCameraTracksOnly();
      this.cameraReady = false;
      this.cdr.detectChanges();
    } catch (e) {
      console.error('capturePhoto failed', e);
      this.notyf.error('Could not capture photo. Please try again.');
    } finally {
      this.capturing = false;
      this.cdr.detectChanges();
    }
  }

  /** Confirm captured photo and close camera panel. */
  submitCapturedPhoto(): void {
    if (!this.pendingFile || !this.pendingPreview) {
      this.notyf.error('No photo to submit. Capture again.');
      return;
    }
    this.profileFile = this.pendingFile;
    this.profilePreview = this.pendingPreview;
    this.clearPendingCapture();
    this.cameraOpen = false;
    this.cameraStarting = false;
    this.notyf.success('Photo saved.');
  }

  /** Discard still and open camera again. */
  retakePhoto(): void {
    this.clearPendingCapture();
    void this.openCamera();
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
