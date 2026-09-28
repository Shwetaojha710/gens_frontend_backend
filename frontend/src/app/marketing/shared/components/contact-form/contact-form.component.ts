import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { CONTACT_INFO } from '../../../data/site-data';
import { PublicLandingService } from '../../../../services/public-landing.service';

/** Self-contained contact form wired to the real public contact endpoint.
 *  Mirrors the form/validation/error-handling in `landing-page.component.ts`
 *  so behaviour (incl. the SuperAdmin "disable public form" switch) stays
 *  consistent across the site. */
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
    email: ['', [Validators.required, Validators.email]],
    message: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(8000)]],
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
          // If the payload shape is unexpected, keep the default (true).
        } catch {
          // Parse failure — keep the default (true), never hide the form on a fetch error.
        }
      },
      error: () => {
        // Fetch failure — keep the default (true), never hide the form on a fetch error.
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
    this.contactSubmitting.set(true);
    this.publicLanding
      .submitContact({
        fullName: String(v.fullName || '').trim(),
        email: String(v.email || '').trim(),
        message: String(v.message || '').trim(),
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

  /** Convenience getters for template validity checks. */
  get fullNameCtrl() {
    return this.contactForm.get('fullName');
  }

  get emailCtrl() {
    return this.contactForm.get('email');
  }

  get messageCtrl() {
    return this.contactForm.get('message');
  }
}
