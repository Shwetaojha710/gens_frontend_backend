import { Component } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  FormControl
} from '@angular/forms';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Notyf } from 'notyf';
import { NgItemLabelDirective } from "@ng-select/ng-select";

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NgItemLabelDirective],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  showMobileLogin = false;      // false = employee email/password, true = interviewer OTP
  form: FormGroup;
  phoneForm: FormGroup;
  otpForm: FormGroup;
  notyf: Notyf;
  interviewerOtpStep = false;
  interviewerResendTimer = 0;
  passwordVisible = false;

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router
  ) {
    this.form = this.fb.group({
      tenantId: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });

    this.phoneForm = this.fb.group({
      tenantId: [''],
      phone: ['', [Validators.required, Validators.pattern(/^[6-9]\d{9}$/)]]
    });

    this.otpForm = this.fb.group({
      digit1: ['', Validators.required],
      digit2: ['', Validators.required],
      digit3: ['', Validators.required],
      digit4: ['', Validators.required]
    });

    this.notyf = new Notyf();
  }

  // ─── Employee Login ───────────────────────────────────────────────────────

  login() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.notyf.error('Please fill in all required fields.');
      return;
    }

    this.auth.loginUser(this.form.value).subscribe({
      next: (res) => {
        const data = JSON.parse(res);
        if (data.status) {
          localStorage.removeItem('empPortalToken');
          localStorage.removeItem('empPortalBranchId');
          localStorage.removeItem('empPortalUser');
          localStorage.removeItem('empPortalTenant');
          localStorage.removeItem('empPortalCurrency');
          localStorage.removeItem('empPortalBaseUrl');
          localStorage.setItem('token', data.data.token);
          localStorage.setItem('base_url', data.data.baseUrl);
          localStorage.setItem('PORT', data.data.PORT);
          localStorage.setItem('user', JSON.stringify(data.data.user));
          localStorage.setItem('tenant', JSON.stringify(data.data.tenant));
          localStorage.setItem('branch', JSON.stringify(data.data.branch));
          localStorage.setItem('currency', JSON.stringify(data.data.currencyList));
          this.notyf.success(data.message);
          const returnUrl = sessionStorage.getItem('returnUrl');
          sessionStorage.removeItem('returnUrl');
          this.router.navigateByUrl(returnUrl || '/branchwise', { replaceUrl: true });
        } else {
          this.notyf.error(data.message);
        }
      },
      error: (err) => this.notyf.error(err?.error?.message || 'Server error. Please try again.')
    });
  }

  // ─── Interviewer OTP Login ────────────────────────────────────────────────

  sendInterviewerOtp() {
    const tenantId = this.phoneForm.get('tenantId')?.value?.trim();
    const phone = this.phoneForm.get('phone')?.value?.trim();

    if (!tenantId) {
      this.notyf.error('Please enter company code.');
      return;
    }
    if (!phone || !/^[6-9]\d{9}$/.test(phone)) {
      this.notyf.error('Please enter a valid 10-digit mobile number.');
      return;
    }

    this.auth.sendOtp({ tenantId, phone }).subscribe({
      next: (res) => {
        const data = JSON.parse(res);
        if (data.status) {
          this.interviewerOtpStep = true;
          this.otpForm.reset();
          this.notyf.success('OTP sent! Check your phone.');
          this.startInterviewerResendTimer();
        } else {
          this.notyf.error(data.message || 'OTP send failed.');
        }
      },
      error: (err) => this.notyf.error(err.error?.message || 'Error sending OTP')
    });
  }

  verifyInterviewerOtp() {
    const { digit1, digit2, digit3, digit4 } = this.otpForm.value;
    const otp = `${digit1 ?? ''}${digit2 ?? ''}${digit3 ?? ''}${digit4 ?? ''}`;
    if (otp.replace(/\s/g, '').length < 4) {
      this.notyf.error('Please enter the complete OTP.');
      return;
    }

    const payload = {
      tenantId: this.phoneForm.get('tenantId')?.value?.trim(),
      phone: this.phoneForm.get('phone')?.value?.trim(),
      otp
    };

    this.auth.verifyOtp(payload).subscribe({
      next: (res) => {
        const data = JSON.parse(res);
        if (data.status) {
          localStorage.setItem('panelToken', data.data.token);
          localStorage.setItem('panelUser', JSON.stringify(data.data.user));
          localStorage.setItem('tenant', JSON.stringify(data.data.tenant));
          localStorage.setItem('branch', JSON.stringify(data.data.branch));
          localStorage.setItem('base_url', data.data.baseUrl);
          localStorage.setItem('PORT', data.data.PORT);
          this.notyf.success('Welcome, ' + data.data.user.first_name + '!');
          this.router.navigate(['interview']);
        } else {
          this.notyf.error(data.message || 'Invalid OTP');
        }
      },
      error: (err) => this.notyf.error(err.error?.message || 'OTP verification failed')
    });
  }

  private startInterviewerResendTimer() {
    this.interviewerResendTimer = 60;
    const interval = setInterval(() => {
      this.interviewerResendTimer--;
      if (this.interviewerResendTimer <= 0) clearInterval(interval);
    }, 1000);
  }

  // ─── Toggle between Employee form and Interviewer OTP form ───────────────

  loginWithMobile() {
    this.showMobileLogin = !this.showMobileLogin;
    this.interviewerOtpStep = false;
    this.phoneForm.reset();
    this.otpForm.reset();
    this.interviewerResendTimer = 0;
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  goToEmpProfile() {
    this.router.navigate(['emp-profile']);
  }

  gotoRegister() {
    this.router.navigate(['company-reg']);
  }

  onInterviewerPhoneInput(event: Event) {
    const value = (event.target as HTMLInputElement).value.replace(/\D/g, '');
    if (value.length === 10 && /^[6-9]\d{9}$/.test(value)) {
      this.sendInterviewerOtp();
    }
  }

  onOtpInput(event: Event, next: HTMLInputElement | null) {
    const input = event.target as HTMLInputElement;
    if (input.value.length === 1 && next) next.focus();
  }

  onOtpKeydown(event: KeyboardEvent, prev: HTMLInputElement | null) {
    const input = event.target as HTMLInputElement;
    if (event.key === 'Backspace' && input.value === '' && prev) prev.focus();
  }

  get phoneControl(): FormControl {
    return this.phoneForm.get('phone') as FormControl;
  }

  isInvalid(form: FormGroup, controlName: string): boolean {
    const control = form.get(controlName);
    return !!control && control.invalid && (control.dirty || control.touched);
  }
}
