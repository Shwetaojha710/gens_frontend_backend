import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Notyf } from 'notyf';
import { SuperadminService } from '../superadmin.service';

@Component({
  selector: 'app-superadmin-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './superadmin-forgot-password.component.html',
  styleUrl: '../login/superadmin-login.component.css',
})
export class SuperadminForgotPasswordComponent {
  form: FormGroup;
  notyf = new Notyf();
  loading = false;
  submitted = false;

  constructor(
    private fb: FormBuilder,
    private api: SuperadminService,
  ) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
    });
  }

  isInvalid(controlName: string): boolean {
    const c = this.form.get(controlName);
    return !!c && c.invalid && (c.dirty || c.touched);
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading = true;
    this.api.forgotPassword(this.form.value.email).subscribe({
      next: (res) => {
        this.loading = false;
        const data = JSON.parse(res);
        if (data.status) {
          this.submitted = true;
        } else {
          this.notyf.error(data.message || 'Something went wrong.');
        }
      },
      error: () => {
        this.loading = false;
        this.notyf.error('Server error. Please try again.');
      },
    });
  }
}
