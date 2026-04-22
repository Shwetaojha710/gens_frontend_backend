import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Notyf } from 'notyf';
import { combineLatest } from 'rxjs';
import { JobService } from '../../services/job.service';

@Component({
  selector: 'app-candidate',
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './candidate.component.html',
  styleUrl: './candidate.component.css'
})
export class CandidateComponent {
  notyf: Notyf;
  isLoadingJob = true;
  isSubmitting = false;
  isCheckingDuplicate = false;
  isCheckingDuplicatePhone = false;
  duplicateFound = false;
  duplicatePhoneFound = false;
  hasSubmitted = false;
  invalidLinkMessage = '';
  selectedFile: File | null = null;
  selectedFileName = '';
  currentYear = new Date().getFullYear();
  maxResumeSizeMb = 5;
  readonly acceptedResumeTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];
  readonly acceptedResumeExtensions = ['pdf', 'doc', 'docx'];
  jobPosting: any = null;
  routeSlug = '';
  jobId = '';
  token = '';
  duplicateCheckEmail = '';
  duplicateCheckPhone = '';
  applicationForm: FormGroup<{
    name: FormControl<string | null>;
    email: FormControl<string | null>;
    phone: FormControl<string | null>;
    current_company: FormControl<string | null>;
    skills: FormControl<string | null>;
    experience: FormControl<string | null>;
    current_ctc: FormControl<string | null>;
    expected_ctc: FormControl<string | null>;
    notice_period: FormControl<string | null>;
    cover_letter: FormControl<string | null>;
  }>;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private jobService: JobService
  ) {
    this.notyf = new Notyf();
    this.applicationForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
      current_company: [''],
      skills: [''],
      experience: ['', [Validators.required, Validators.min(0)]],
      current_ctc: ['', [Validators.required, Validators.min(0)]],
      expected_ctc: ['', [Validators.min(0)]],
      notice_period: ['', [Validators.required, Validators.min(0)]],
      cover_letter: ['', [Validators.maxLength(2000)]]
    });
  }

  ngOnInit() {
    combineLatest([this.route.paramMap, this.route.queryParamMap]).subscribe(([params, queryParams]) => {
      this.routeSlug = params.get('slug') || '';
      this.jobId = queryParams.get('job_id') || '';
      this.token = queryParams.get('token') || '';
      this.loadPublicJobPosting();
    });


  }

  get f() {
    return this.applicationForm.controls;
  }

  get nameControl() {
    return this.applicationForm.controls.name;
  }

  get emailControl() {
    return this.applicationForm.controls.email;
  }

  get phoneControl() {
    return this.applicationForm.controls.phone;
  }

  get currentCompanyControl() {
    return this.applicationForm.controls.current_company;
  }

  get skillsControl() {
    return this.applicationForm.controls.skills;
  }

  get experienceControl() {
    return this.applicationForm.controls.experience;
  }

  get currentCtcControl() {
    return this.applicationForm.controls.current_ctc;
  }

  get expectedCtcControl() {
    return this.applicationForm.controls.expected_ctc;
  }

  get noticePeriodControl() {
    return this.applicationForm.controls.notice_period;
  }

  get coverLetterControl() {
    return this.applicationForm.controls.cover_letter;
  }

  get coverLetterLength(): number {
    return this.coverLetterControl.value?.length || 0;
  }

  get hasValidJobContext(): boolean {
    return !!(this.jobId || this.routeSlug);
  }

  get isJobOpen(): boolean {
    const status = (this.jobPosting?.status || '').toLowerCase();
    return status === 'open';
  }

  get canSubmit(): boolean {
    return this.applicationForm.valid
      && !!this.selectedFile
      && !this.duplicateFound
      && !this.duplicatePhoneFound
      && !this.isSubmitting
      && !this.isCheckingDuplicate
      && !this.isCheckingDuplicatePhone
      && this.isJobOpen;
  }

  getStatusLabel(status: string): string {
    const value = (status || '').toLowerCase();

    if (value === 'open') {
      return 'Open';
    }

    if (value === 'close' || value === 'closed') {
      return 'Closed';
    }

    if (value === 'draft') {
      return 'Draft';
    }

    return status || '-';
  }

  getStatusClass(status: string): string {
    const value = (status || '').toLowerCase();

    if (value == 'open') {
      return 'status-open';
    }

    if (value == 'close' || value == 'closed') {
      return 'status-closed';
    }

    return 'status-draft';
  }

  getSkillList(skills: any): string[] {
    if (Array.isArray(skills)) {
      return skills.filter(Boolean);
    }

    if (typeof skills === 'string' && skills.trim()) {
      return skills.split(',').map((skill: string) => skill.trim()).filter(Boolean);
    }

    return [];
  }

  onPhoneInput(event: Event) {
    const input = event.target as HTMLInputElement;
    const digitsOnly = input.value.replace(/\D/g, '').slice(0, 10);

    if (input.value !== digitsOnly) {
      input.value = digitsOnly;
    }

    this.phoneControl.setValue(digitsOnly, { emitEvent: false });

    this.duplicatePhoneFound = false;
    this.duplicateCheckPhone = '';

    const phoneControl = this.applicationForm.get('phone');
    if (phoneControl?.hasError('duplicatePhone')) {
      const errors = { ...(phoneControl.errors || {}) };
      delete errors['duplicatePhone'];
      phoneControl.setErrors(Object.keys(errors).length ? errors : null);
    }
  }

  onResumeSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] || null;

    this.selectedFile = null;
    this.selectedFileName = '';

    if (!file) {
      return;
    }

    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    const isValidType = this.acceptedResumeTypes.includes(file.type) || this.acceptedResumeExtensions.includes(extension);
    const isValidSize = file.size <= this.maxResumeSizeMb * 1024 * 1024;

    if (!isValidType) {
      input.value = '';
      this.notyf.error('Resume must be a PDF, DOC, or DOCX file');
      return;
    }

    if (!isValidSize) {
      input.value = '';
      this.notyf.error(`Resume size must be less than ${this.maxResumeSizeMb} MB`);
      return;
    }

    this.selectedFile = file;
    this.selectedFileName = file.name;
  }

  onEmailInput() {
    this.duplicateFound = false;
    this.duplicateCheckEmail = '';

    const emailControl = this.applicationForm.get('email');
    if (emailControl?.hasError('duplicate')) {
      const errors = { ...(emailControl.errors || {}) };
      delete errors['duplicate'];
      emailControl.setErrors(Object.keys(errors).length ? errors : null);
    }
  }

  checkDuplicateEmail(submitAfterCheck = false) {
    const email = this.applicationForm.value.email?.trim().toLowerCase() || '';

    if (!email || this.f.email.invalid || !this.hasValidJobContext) {
      this.duplicateFound = false;
      return;
    }

    if (this.duplicateCheckEmail === email) {
      return;
    }

    this.isCheckingDuplicate = true;

    this.jobService.checkDuplicateCandidateApplication({
      email,
      job_posting_id: this.jobPosting?.id || this.jobId,
      job_id: this.jobId,
      slug: this.routeSlug,
      token: this.token
    }).subscribe({
      next: (response: any) => {
        this.isCheckingDuplicate = false;
        const duplicateExists = !!(response?.exists || response?.isDuplicate || response?.data?.exists);

        this.duplicateFound = duplicateExists;
        this.duplicateCheckEmail = email;

        if (duplicateExists) {
          this.applicationForm.get('email')?.setErrors({ duplicate: true });
          this.notyf.error(response?.message || 'This email has already applied for this job posting');
          return;
        }

        this.onEmailInput();
        this.duplicateCheckEmail = email;

        if (submitAfterCheck) {
          this.performSubmit(email);
        }
      },
      error: (err: any) => {
        this.isCheckingDuplicate = false;
        this.duplicateFound = false;
        this.notyf.error(err?.error?.message || 'Unable to validate duplicate application');
      }
    });
  }

  checkDuplicateMobile(submitAfterCheck = false) {
    const phone = (this.phoneControl.value || '').replace(/\D/g, '');

    if (!phone || phone.length !== 10 || !this.hasValidJobContext) {
      this.duplicatePhoneFound = false;
      return;
    }

    if (this.duplicateCheckPhone === phone) {
      return;
    }

    this.isCheckingDuplicatePhone = true;

    this.jobService.checkDuplicateCandidateApplication({
      phone,
      job_posting_id: this.jobPosting?.id || this.jobId,
      job_id: this.jobId,
      slug: this.routeSlug,
      token: this.token
    }).subscribe({
      next: (response: any) => {
        this.isCheckingDuplicatePhone = false;
        const duplicateExists = !!(response?.exists || response?.isDuplicate || response?.data?.exists);

        this.duplicatePhoneFound = duplicateExists;
        this.duplicateCheckPhone = phone;

        if (duplicateExists) {
          this.applicationForm.get('phone')?.setErrors({ duplicatePhone: true });
          this.notyf.error(response?.message || 'This phone number has already been used for this posting');
          return;
        }

        const phoneControl = this.applicationForm.get('phone');
        if (phoneControl?.hasError('duplicatePhone')) {
          const errors = { ...(phoneControl.errors || {}) };
          delete errors['duplicatePhone'];
          phoneControl.setErrors(Object.keys(errors).length ? errors : null);
        }
        this.duplicateCheckPhone = phone;

        if (submitAfterCheck) {
          const email = this.applicationForm.value.email?.trim().toLowerCase() || '';
          this.performSubmit(email);
        }
      },
      error: (err: any) => {
        this.isCheckingDuplicatePhone = false;
        this.duplicatePhoneFound = false;
        this.notyf.error(err?.error?.message || 'Unable to validate duplicate application');
      }
    });
  }

  submitApplication() {
    this.applicationForm.markAllAsTouched();

    if (!this.selectedFile) {
      this.notyf.error('Please upload your resume before submitting');
      return;
    }

    if (this.applicationForm.invalid) {
      this.notyf.error('Please complete all required fields');
      return;
    }

    if (this.duplicateFound) {
      this.notyf.error('This email has already applied for this job posting');
      return;
    }

    if (this.duplicatePhoneFound) {
      this.notyf.error('This phone number has already been used for this posting');
      return;
    }

    if (!this.isJobOpen) {
      this.notyf.error('Applications are currently not open for this posting');
      return;
    }

    const phone = this.applicationForm.value.phone?.trim() || '';
    if (phone && this.duplicateCheckPhone !== phone) {
      this.checkDuplicateMobile(true);
      return;
    }

    const email = this.applicationForm.value.email?.trim().toLowerCase() || '';
    if (email && this.duplicateCheckEmail !== email) {
      this.checkDuplicateEmail(true);
      return;
    }

    this.performSubmit(email);
  }

  private performSubmit(email: string) {
    if (!this.selectedFile) {
      this.notyf.error('Please upload your resume before submitting');
      return;
    }

    const resumeFile = this.selectedFile;
    const payload = new FormData();
    payload.append('name', this.applicationForm.value.name || '');
    payload.append('email', email);
    payload.append('phone', this.applicationForm.value.phone || '');
    payload.append('current_company', this.applicationForm.value.current_company || '');
    payload.append('skills', this.applicationForm.value.skills || '');
    payload.append('experience', String(this.applicationForm.value.experience || '0'));
    payload.append('current_ctc', String(this.applicationForm.value.current_ctc || '0'));
    payload.append('expected_ctc', String(this.applicationForm.value.expected_ctc || '0'));
    payload.append('notice_period', String(this.applicationForm.value.notice_period || '0'));
    payload.append('cover_letter', this.applicationForm.value.cover_letter || '');
    payload.append('resume', resumeFile, resumeFile.name);
    payload.append('job_posting_id', this.jobPosting?.id || this.jobId);
    payload.append('job_id', this.jobId);
    payload.append('slug', this.routeSlug);
    payload.append('token', this.token);
    payload.append('trigger_ats_scan', 'true');
    payload.append('send_confirmation_email', 'true');

    this.isSubmitting = true;

    this.jobService.submitCandidateApplication(payload).subscribe({
      next: (response: any) => {
        this.isSubmitting = false;

        if (response?.status === true || response?.success === true) {
          this.hasSubmitted = true;
          this.notyf.success(response?.message || 'Application submitted successfully');
          this.applicationForm.reset();
          this.selectedFile = null;
          this.selectedFileName = '';
          this.duplicateFound = false;
          this.duplicateCheckEmail = '';
          this.duplicatePhoneFound = false;
          this.duplicateCheckPhone = '';
          return;
        }

        this.notyf.error(response?.message || 'Unable to submit your application');
      },
      error: (err: any) => {
        this.isSubmitting = false;
        this.notyf.error(err?.error?.message || 'Unable to submit your application');
      }
    });
  }

  private loadPublicJobPosting() {
    this.isLoadingJob = true;
    this.invalidLinkMessage = '';
    this.hasSubmitted = false;

    if (!this.hasValidJobContext) {
      this.isLoadingJob = false;
      this.invalidLinkMessage = 'This job application link is missing the required job information.';
      return;
    }

    const payload = {
      job_id: this.jobId,
      slug: this.routeSlug,
      token: this.token
    };

    this.jobService.getPublicJobPosting(payload).subscribe({
      next: (response: any) => {
        if (response?.status === true && response?.data) {
          this.jobPosting = response.data;
          this.isLoadingJob = false;
          return;
        }

        this.fallbackLoadJobPosting();
      },
      error: () => {
        this.fallbackLoadJobPosting();
      }
    });
  }

  private fallbackLoadJobPosting() {
    let obj={}
    this.jobService.getJobRequirements(obj).subscribe({
      next: (response: any) => {
        const allJobs = response?.data || [];
        let matchedJob = null;

        if (this.jobId) {
          matchedJob = allJobs.find(
            (item: any) => item?.id === this.jobId || item?.job_id === this.jobId
          );
        }

        if (!matchedJob && this.routeSlug) {
          matchedJob = allJobs.find((item: any) => item?.slug === this.routeSlug);
        }

        this.jobPosting = matchedJob || null;
        this.isLoadingJob = false;

        if (!this.jobPosting) {
          this.invalidLinkMessage = 'We could not find an active job posting for this application link.';
        }
      },
      error: (err: any) => {
        this.isLoadingJob = false;
        this.invalidLinkMessage = err?.error?.message || 'Unable to load job posting details right now.';
      }
    });
  }

  parseJobDescription(text: string): string {
    if (!text || !text.trim()) return '<p class="text-muted">Detailed job information will be reviewed during the screening process.</p>';

    const escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    const lines = escaped.split('\n');
    const result: string[] = [];
    let inList = false;

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('* ')) {
        if (!inList) { result.push('<ul class="ps-3 mb-1">'); inList = true; }
        result.push(`<li>${this.applyInlineMd(trimmed.slice(2))}</li>`);
      } else {
        if (inList) { result.push('</ul>'); inList = false; }
        if (trimmed === '') {
          result.push('<br>');
        } else {
          result.push(`<p class="mb-1">${this.applyInlineMd(trimmed)}</p>`);
        }
      }
    }

    if (inList) result.push('</ul>');
    return result.join('');
  }

  private applyInlineMd(text: string): string {
    return text.replace(/\*([^*\n]+)\*/g, '<strong>$1</strong>');
  }
}
