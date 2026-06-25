import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Notyf } from 'notyf';
import { SuperadminService } from '../superadmin.service';

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const pw = group.get('newPassword')?.value;
  const confirm = group.get('confirmPassword')?.value;
  return pw === confirm ? null : { mismatch: true };
}

@Component({
  selector: 'app-superadmin-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './superadmin-reset-password.component.html',
  styleUrl: '../login/superadmin-login.component.css',
})
export class SuperadminResetPasswordComponent implements OnInit {
  form: FormGroup;
  notyf = new Notyf();
  loading = false;
  resetDone = false;
  tokenMissing = false;
  showNew = false;
  showConfirm = false;
  private token = '';

  constructor(
    private fb: FormBuilder,
    private api: SuperadminService,
    private route: ActivatedRoute,
  ) {
    this.form = this.fb.group(
      {
        newPassword: ['', [Validators.required, Validators.minLength(6)]],
        confirmPassword: ['', Validators.required],
      },
      { validators: passwordsMatch },
    );
  }

  ngOnInit() {
    this.token = this.route.snapshot.queryParamMap.get('token') || '';
    if (!this.token) this.tokenMissing = true;
  }

  isInvalid(controlName: string): boolean {
    const c = this.form.get(controlName);
    const groupError = controlName === 'confirmPassword' && this.form.hasError('mismatch');
    return (!!c && c.invalid && (c.dirty || c.touched)) || (groupError && (c?.dirty || c?.touched) === true);
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading = true;
    this.api.resetPassword(this.token, this.form.value.newPassword).subscribe({
      next: (res) => {
        this.loading = false;
        const data = JSON.parse(res);
        if (data.status) {
          this.resetDone = true;
        } else {
          if (data.message?.toLowerCase().includes('invalid') || data.message?.toLowerCase().includes('expired')) {
            this.tokenMissing = true;
          } else {
            this.notyf.error(data.message || 'Something went wrong.');
          }
        }
      },
      error: () => {
        this.loading = false;
        this.notyf.error('Server error. Please try again.');
      },
    });
  }
}
