import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Notyf } from 'notyf';
import { SuperadminService } from '../superadmin.service';

@Component({
  selector: 'app-superadmin-landing',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './superadmin-landing.component.html',
  styleUrl: './superadmin-landing.component.css',
})
export class SuperadminLandingComponent implements OnInit {
  notyf = new Notyf();
  loading = true;
  saving = false;
  updatedAt: string | null = null;
  form!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private api: SuperadminService,
  ) {
    this.form = this.buildForm();
  }

  ngOnInit(): void {
    this.api.getLandingContent().subscribe({
      next: (raw) => {
        try {
          const data = JSON.parse(raw);
          if (data?.status && data.data?.content) {
            this.updatedAt = data.data.updatedAt || null;
            this.patchFromContent(data.data.content);
          } else {
            this.notyf.error(data?.message || 'Could not load landing content.');
          }
        } catch {
          this.notyf.error('Invalid response from server.');
        }
        this.loading = false;
      },
      error: () => {
        this.notyf.error('Failed to load landing content.');
        this.loading = false;
      },
    });
  }

  private buildForm(): FormGroup {
    return this.fb.group({
      hero: this.fb.group({
        titleLead: ['', Validators.required],
        titleAccent: ['', Validators.required],
        subtitle: [''],
        primaryCtaLabel: [''],
        primaryCtaHref: [''],
        secondaryCtaLabel: [''],
        secondaryCtaHref: [''],
        trustLine: [''],
      }),
      features: this.fb.group({
        kicker: [''],
        title: [''],
        subtitle: [''],
        items: this.fb.array([]),
      }),
      pricing: this.fb.group({
        kicker: [''],
        title: [''],
        subtitle: [''],
        currencySymbol: [''],
        footerNote: [''],
      }),
      subscription: this.fb.group({
        title: [''],
        subtitle: [''],
        bullets: this.fb.array([]),
      }),
      stats: this.fb.group({
        items: this.fb.array([]),
      }),
      faq: this.fb.group({
        kicker: [''],
        title: [''],
        subtitle: [''],
        items: this.fb.array([]),
      }),
      cta: this.fb.group({
        title: [''],
        subtitle: [''],
        buttonLabel: [''],
        buttonHref: [''],
      }),
      contact: this.fb.group({
        kicker: [''],
        title: [''],
        subtitle: [''],
        cardTagline: [''],
        cardTitle: [''],
        cardBody: [''],
        formTitle: [''],
        formEnabled: [true],
        formHelpText: [''],
        namePlaceholder: [''],
        emailPlaceholder: [''],
        messagePlaceholder: [''],
        submitButtonLabel: [''],
        formClosedMessage: [''],
      }),
    });
  }

  private patchFromContent(c: any): void {
    this.form.patchValue({
      hero: c.hero,
      pricing: c.pricing,
      cta: c.cta,
      contact: c.contact,
    });
    (this.form.get('features') as FormGroup).patchValue({
      kicker: c.features?.kicker,
      title: c.features?.title,
      subtitle: c.features?.subtitle,
    });
    (this.form.get('faq') as FormGroup).patchValue({
      kicker: c.faq?.kicker,
      title: c.faq?.title,
      subtitle: c.faq?.subtitle,
    });
    (this.form.get('subscription') as FormGroup).patchValue({
      title: c.subscription?.title,
      subtitle: c.subscription?.subtitle,
    });

    this.setFaArray('features', 'items', c.features?.items, (x) =>
      this.fb.group({
        icon: [x.icon || 'ri-star-line'],
        title: [x.title || ''],
        description: [x.description || ''],
      }),
    );
    this.setFaArray('stats', 'items', c.stats?.items, (x) =>
      this.fb.group({
        icon: [x.icon || 'ri-bar-chart-line'],
        value: [x.value || ''],
        label: [x.label || ''],
      }),
    );
    this.setFaArray('faq', 'items', c.faq?.items, (x) =>
      this.fb.group({
        q: [x.q || ''],
        a: [x.a || ''],
      }),
    );
    const subBullets = c.subscription?.bullets || [];
    const subFa = (this.form.get('subscription') as FormGroup).get('bullets') as FormArray;
    subFa.clear();
    subBullets.forEach((t: string) => subFa.push(this.fb.control(t || '')));
    if (subFa.length === 0) subFa.push(this.fb.control(''));
  }

  private setFaArray(
    parentKey: string,
    arrayKey: string,
    rows: any[] | undefined,
    factory: (row: any) => FormGroup,
  ): void {
    const parent = this.form.get(parentKey) as FormGroup;
    const fa = parent.get(arrayKey) as FormArray;
    fa.clear();
    (rows || []).forEach((row) => fa.push(factory(row)));
    if (fa.length === 0) fa.push(factory({}));
  }

  featureItems(): FormArray {
    return (this.form.get('features') as FormGroup).get('items') as FormArray;
  }
  statItems(): FormArray {
    return (this.form.get('stats') as FormGroup).get('items') as FormArray;
  }
  faqItems(): FormArray {
    return (this.form.get('faq') as FormGroup).get('items') as FormArray;
  }
  subBullets(): FormArray {
    return (this.form.get('subscription') as FormGroup).get('bullets') as FormArray;
  }

  addFeature(): void {
    this.featureItems().push(
      this.fb.group({ icon: ['ri-star-line'], title: [''], description: [''] }),
    );
  }
  removeFeature(i: number): void {
    this.featureItems().removeAt(i);
  }
  addStat(): void {
    this.statItems().push(
      this.fb.group({ icon: ['ri-bar-chart-line'], value: [''], label: [''] }),
    );
  }
  removeStat(i: number): void {
    this.statItems().removeAt(i);
  }
  addFaq(): void {
    this.faqItems().push(this.fb.group({ q: [''], a: [''] }));
  }
  removeFaq(i: number): void {
    this.faqItems().removeAt(i);
  }
  addBullet(): void {
    this.subBullets().push(this.fb.control(''));
  }
  removeBullet(i: number): void {
    this.subBullets().removeAt(i);
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.notyf.error('Fill required hero fields.');
      return;
    }
    const v = this.form.getRawValue();
    const content = {
      ...v,
      subscription: {
        ...v.subscription,
        bullets: (v.subscription.bullets as string[]).map((s) => String(s).trim()).filter(Boolean),
      },
    };
    this.saving = true;
    this.api.saveLandingContent(content).subscribe({
      next: (raw) => {
        try {
          const data = JSON.parse(raw);
          if (data?.status) {
            this.notyf.success(data.message || 'Saved.');
            if (data.data?.content) this.patchFromContent(data.data.content);
          } else {
            this.notyf.error(data?.message || 'Save failed.');
          }
        } catch {
          this.notyf.error('Invalid save response.');
        }
        this.saving = false;
      },
      error: () => {
        this.notyf.error('Save request failed.');
        this.saving = false;
      },
    });
  }
}
