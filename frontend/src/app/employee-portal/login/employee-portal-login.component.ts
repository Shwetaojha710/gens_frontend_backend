import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Notyf } from 'notyf';
import { EmployeePortalService } from '../services/employee-portal.service';

@Component({
  selector: 'app-employee-portal-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './employee-portal-login.component.html',
  styleUrls: ['./employee-portal-login.component.css', '../../login/login.component.css'],
})
export class EmployeePortalLoginComponent {
  otpStep = false;
  loading = false;
  resendTimer = 0;
  tenantForm: FormGroup;
  otpForm: FormGroup;
  private notyf = new Notyf();

  constructor(
    private fb: FormBuilder,
    private api: EmployeePortalService,
    private router: Router,
  ) {
    this.tenantForm = this.fb.group({
      tenantId: ['', Validators.required],
      mobile: ['', [Validators.required, Validators.pattern(/^[6-9]\d{9}$/)]],
    });
    this.otpForm = this.fb.group({
      digit1: ['', Validators.required],
      digit2: ['', Validators.required],
      digit3: ['', Validators.required],
      digit4: ['', Validators.required],
    });
  }

  get phoneControl(): FormControl {
    return this.tenantForm.get('mobile') as FormControl;
  }

  isInvalid(form: FormGroup, controlName: string): boolean {
    const control = form.get(controlName);
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  onPhoneInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value.replace(/\D/g, '');
    input.value = value;
    this.phoneControl.setValue(value);
    if (value.length === 10 && this.tenantForm.get('tenantId')?.valid) {
      this.sendOtp();
    }
  }

  onOtpInput(event: Event, next: HTMLInputElement | null): void {
    const input = event.target as HTMLInputElement;
    if (input.value.length === 1 && next) {
      next.focus();
    }
  }

  onOtpKeydown(event: KeyboardEvent, prev: HTMLInputElement | null): void {
    const input = event.target as HTMLInputElement;
    if (event.key === 'Backspace' && input.value === '' && prev) {
      prev.focus();
    }
  }

  private startResendTimer(): void {
    this.resendTimer = 60;
    const interval = setInterval(() => {
      this.resendTimer--;
      if (this.resendTimer <= 0) {
        clearInterval(interval);
      }
    }, 1000);
  }

  sendOtp(): void {
    if (this.tenantForm.invalid) {
      this.tenantForm.markAllAsTouched();
      this.notyf.error('Enter company code and a valid 10-digit mobile number.');
      return;
    }
    this.loading = true;
    const { tenantId, mobile } = this.tenantForm.getRawValue();
    this.api.sendOtp(mobile!, tenantId!.trim()).subscribe({
      next: (res) => {
        this.loading = false;
        if (res.status === true) {
          this.otpStep = true;
          this.otpForm.reset();
          this.startResendTimer();
          this.notyf.success(res.message || 'OTP sent.');
        } else {
          this.notyf.error(res.message || 'Could not send OTP.');
        }
      },
      error: () => {
        this.loading = false;
        this.notyf.error('Network error.');
      },
    });
  }

  verify(): void {
    if (this.otpForm.invalid) {
      this.otpForm.markAllAsTouched();
      return;
    }
    const tenantId = this.tenantForm.get('tenantId')?.value?.trim();
    const mobile = this.tenantForm.get('mobile')?.value;
    const { digit1, digit2, digit3, digit4 } = this.otpForm.getRawValue();
    const otp = `${digit1}${digit2}${digit3}${digit4}`;
    if (!tenantId || !mobile || !otp) return;

    this.loading = true;
    this.api.verifyOtp(mobile, tenantId, otp).subscribe({
      next: (res) => {
        this.loading = false;
        const data = res['data'] as
          | {
              token: string;
              user: { id: string; branchId?: string };
              tenant?: { id: string; companyName: string; companyCode: string };
              currencyList?: unknown;
              baseUrl?: string;
              PORT?: string;
            }
          | undefined;
        if (res['status'] !== true || !data?.token) {
          this.notyf.error(String(res['message'] || 'Invalid OTP.'));
          return;
        }
        const d = data;
        localStorage.removeItem('token');
        localStorage.removeItem('branchId');
        localStorage.setItem('empPortalToken', d.token);
        localStorage.setItem('empPortalBranchId', d.user.branchId || '');
        localStorage.setItem('empPortalUser', JSON.stringify(d.user));
        if (d.tenant) localStorage.setItem('empPortalTenant', JSON.stringify(d.tenant));
        if (d.currencyList) localStorage.setItem('empPortalCurrency', JSON.stringify(d.currencyList));
        if (d.baseUrl) localStorage.setItem('empPortalBaseUrl', String(d.baseUrl));

        this.notyf.success(String(res['message'] || 'Welcome!'));
        void this.router.navigate(['/employee-portal/dashboard']);
      },
      error: () => {
        this.loading = false;
        this.notyf.error('Verification failed.');
      },
    });
  }

  back(): void {
    this.otpStep = false;
    this.otpForm.reset();
    this.resendTimer = 0;
  }
}
