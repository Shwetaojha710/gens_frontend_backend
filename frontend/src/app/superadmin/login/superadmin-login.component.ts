import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Notyf } from 'notyf';
import { SuperadminService } from '../superadmin.service';

@Component({
  selector: 'app-superadmin-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './superadmin-login.component.html',
  styleUrls: [
    '../../login/login.component.css',
    './superadmin-login.component.css',
  ],
})
export class SuperadminLoginComponent {
  form: FormGroup;
  notyf = new Notyf();
  passwordVisible = false;
  submitting = false;

  constructor(
    private fb: FormBuilder,
    private api: SuperadminService,
    private router: Router,
  ) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
    });
  }

  isInvalid(controlName: string): boolean {
    const c = this.form.get(controlName);
    return !!c && c.invalid && (c.dirty || c.touched);
  }

  login() {
    if (this.submitting) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.notyf.error('Please fill in all required fields.');
      return;
    }

    this.submitting = true;
    this.api.login(this.form.value).subscribe({
      next: (res) => {
        this.submitting = false;
        let data: any;
        try {
          data = typeof res === 'string' ? JSON.parse(res) : res;
        } catch {
          this.notyf.error('Unexpected server response.');
          return;
        }
        if (!data.status) {
          this.notyf.error(data.message || 'Login failed.');
          return;
        }

        localStorage.setItem('superadminToken', data.data.token);
        localStorage.setItem('superadminUser', JSON.stringify(data.data.user));
        if (data.data.baseUrl) {
          localStorage.setItem('base_url', data.data.baseUrl);
        }
        if (data.data.PORT) localStorage.setItem('PORT', String(data.data.PORT));
        this.notyf.success(data.message || 'Login successful!');
        this.router.navigate(['superadmin/dashboard']);
      },
      error: (err) => {
        this.submitting = false;
        let msg = 'Server error. Please try again.';
        if (typeof err?.error === 'string' && err.error.trim()) {
          try {
            const d = JSON.parse(err.error);
            if (d?.message) msg = d.message;
          } catch {
            /* keep msg */
          }
        } else if (err?.error?.message) {
          msg = err.error.message;
        }
        this.notyf.error(msg);
      },
    });
  }
}

