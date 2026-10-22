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

  readonly countryCodes = [
    { code: '+91', label: 'India (+91)' },
    { code: '+971', label: 'UAE (+971)' },
    { code: '+966', label: 'Saudi Arabia (+966)' },
    { code: '+974', label: 'Qatar (+974)' },
    { code: '+965', label: 'Kuwait (+965)' },
    { code: '+968', label: 'Oman (+968)' },
    { code: '+973', label: 'Bahrain (+973)' },
    { code: '+1', label: 'USA / Canada (+1)' },
    { code: '+44', label: 'UK (+44)' },
    { code: '+61', label: 'Australia (+61)' },
    { code: '+65', label: 'Singapore (+65)' },
    { code: '+60', label: 'Malaysia (+60)' },
    { code: '+49', label: 'Germany (+49)' },
    { code: '+33', label: 'France (+33)' },
    { code: '+81', label: 'Japan (+81)' },
    { code: '+86', label: 'China (+86)' },
    { code: '+977', label: 'Nepal (+977)' },
    { code: '+880', label: 'Bangladesh (+880)' },
    { code: '+94', label: 'Sri Lanka (+94)' },
  ] as const;

  readonly contactForm: FormGroup = this.fb.group({
    fullName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(200)]],
    company: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(200)]],
    email: ['', [Validators.required, Validators.email]],
    countryCode: ['+91', [Validators.required]],
    phone: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
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
    const fullPhone = `${String(v.countryCode || '').trim()} ${String(v.phone || '').trim()}`.trim();
    const composed = [
      `Company: ${String(v.company || '').trim()}`,
      `Phone: ${fullPhone}`,
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
              this.contactForm.reset({ countryCode: '+91' });
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

  get countryCodeCtrl() {
    return this.contactForm.get('countryCode');
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
