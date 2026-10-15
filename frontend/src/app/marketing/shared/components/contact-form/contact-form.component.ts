import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { CONTACT_INFO } from '../../../data/site-data';
import { PublicLandingService } from '../../../../services/public-landing.service';

/** Self-contained contact / Request-a-Demo form.
 *  Extra fields (company, phone, employees) are composed into `message`
 *  so the existing public contact API + DB schema stay unchanged. */
@Component({
  selector: 'app-contact-form',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './contact-form.component.html',
  styleUrl: './contact-form.component.css',
})
export class ContactFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly publicLanding = inject(PublicLandingService);

  readonly contactInfo = CONTACT_INFO;

  /** Default true — only hidden if the backend explicitly says formEnabled === false. */
  readonly formEnabled = signal(true);
  readonly contactSubmitting = signal(false);
  readonly contactFeedback = signal<{ ok: boolean; text: string } | null>(null);

  readonly contactForm: FormGroup = this.fb.group({
    fullName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(200)]],
    company: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(200)]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required, Validators.minLength(7), Validators.maxLength(30)]],
    employees: ['', [Validators.required]],
    message: ['', [Validators.maxLength(8000)]],
  });

  ngOnInit(): void {
    this.fetchFormAvailability();
  }

  private fetchFormAvailability(): void {
    this.publicLanding.getLanding().subscribe({
      next: (raw) => {
        try {
          const data = JSON.parse(raw);
          if (data?.status && data.data) {
            const enabled = data.data.content?.contact?.formEnabled;
            this.formEnabled.set(enabled !== false);
          }
        } catch {
          /* keep default */
        }
      },
      error: () => {
        /* keep default */
      },
    });
  }

  submitContact(): void {
    if (this.contactSubmitting()) return;
    this.contactFeedback.set(null);
    if (this.contactForm.invalid) {
      this.contactForm.markAllAsTouched();
      return;
    }

    const v = this.contactForm.getRawValue();
    const optionalNote = String(v.message || '').trim();
    // Compose structured message for existing API (requires message ≥ 10 chars).
    const composed = [
      `Company: ${String(v.company || '').trim()}`,
      `Phone: ${String(v.phone || '').trim()}`,
      `Number of Employees: ${String(v.employees || '').trim()}`,
      optionalNote ? `Notes: ${optionalNote}` : 'Notes: (none)',
    ].join('\n');

    this.contactSubmitting.set(true);
    this.publicLanding
      .submitContact({
        fullName: String(v.fullName || '').trim(),
        email: String(v.email || '').trim(),
        message: composed,
      })
      .pipe(finalize(() => this.contactSubmitting.set(false)))
      .subscribe({
        next: (raw) => {
          try {
            const data = JSON.parse(raw) as { status?: boolean; message?: string };
            if (data?.status) {
              this.contactFeedback.set({ ok: true, text: data.message || 'Thank you.' });
              this.contactForm.reset();
            } else {
              this.contactFeedback.set({ ok: false, text: data?.message || 'Could not send your message.' });
            }
          } catch {
            this.contactFeedback.set({ ok: false, text: 'Unexpected response from server.' });
          }
        },
        error: (err: HttpErrorResponse) => {
          let msg = 'Could not reach the server.';
          if (err.status === 429) {
            msg = 'Too many attempts. Please try again later.';
          }
          if (typeof err.error === 'string' && err.error.trim()) {
            try {
              const d = JSON.parse(err.error) as { message?: string };
              if (d?.message) msg = d.message;
            } catch {
              /* keep msg */
            }
          }
          this.contactFeedback.set({ ok: false, text: msg });
        },
      });
  }

  get fullNameCtrl() {
    return this.contactForm.get('fullName');
  }

  get companyCtrl() {
    return this.contactForm.get('company');
  }

  get emailCtrl() {
    return this.contactForm.get('email');
  }

  get phoneCtrl() {
    return this.contactForm.get('phone');
  }

  get employeesCtrl() {
    return this.contactForm.get('employees');
  }

  get messageCtrl() {
    return this.contactForm.get('message');
  }
}
