import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Notyf } from 'notyf';
import { SuperadminService } from '../superadmin.service';

@Component({
  selector: 'app-superadmin-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './superadmin-login.component.html',
  styleUrl: './superadmin-login.component.css',
})
export class SuperadminLoginComponent {
  form: FormGroup;
  notyf = new Notyf();
  passwordVisible = false;

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
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.notyf.error('Please fill in all required fields.');
      return;
    }

    this.api.login(this.form.value).subscribe({
      next: (res) => {
        const data = JSON.parse(res);
        if (!data.status) {
          this.notyf.error(data.message || 'Login failed.');
          return;
        }

        localStorage.setItem('superadminToken', data.data.token);
        localStorage.setItem('superadminUser', JSON.stringify(data.data.user));
        if (data.data.baseUrl)
          {
            localStorage.setItem('base_url', data.data.baseUrl);
          }
        if (data.data.PORT) localStorage.setItem('PORT', String(data.data.PORT));
        this.notyf.success(data.message || 'Login successful!');
        this.router.navigate(['superadmin/dashboard']);
      },
      error: (err) => {
        this.notyf.error(err?.error?.message || 'Server error. Please try again.');
      },
    });
  }
}

