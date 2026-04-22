import { CommonModule } from '@angular/common';
import { Component, HostListener, NgZone } from '@angular/core';
import { FormGroup, FormsModule, Validators } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { SearchPaginationComponent } from '../../../master/search-pagination/search-pagination.component';
import { Router } from '@angular/router';
import { Notyf } from 'notyf';
import { JobService } from '../../../services/job.service';
import { MessagingService } from '../../../services/messaging.service';
import { StatusService } from '../../../services/status.service';
import { RouterModule } from '@angular/router';
import Swal from 'sweetalert2';

declare let bootstrap: any;
@Component({
  selector: 'app-posting-sourcing',
  imports: [NgSelectModule,
    FormsModule, CommonModule, SearchPaginationComponent, RouterModule],
  templateUrl: './posting-sourcing.component.html',
  styleUrl: './posting-sourcing.component.css'
})
export class PostingSourcingComponent {
  notyf: Notyf;
  EmployeeForm!: FormGroup;
  EmployeeList = [];
  editingId: number | null = null;
  minDate: any
  tenant: any = {};
  constructor(
    public jobService: JobService,
    private router: Router,
    public messagingService: MessagingService,
    public statusService: StatusService,
    private jobSvc: JobService,
    private ngZone: NgZone,
  ) {

    const today = new Date();
    this.minDate = today.toISOString().split('T')[0]; // today
    this.notyf = new Notyf();
    this.tenant = JSON.parse(localStorage.getItem('tenant') || '{}');
  }
  channels = [
    { id: 'linkedin', label: 'LinkedIn', color: '#0A66C2' },
    { id: 'naukri', label: 'Naukri', color: '#FF7555' },
    { id: 'referral', label: 'Referral email', color: '#22c55e' },
    { id: 'campus', label: 'Campus drive', color: '#8b5cf6' },
    { id: 'job_board', label: 'Job board', color: '#f59e0b' },
    { id: 'direct', label: 'Careers page', color: '#6b7280' },
  ];


  expireDays = [
    { value: '14', label: '14 days' },
    { value: '21', label: '21 days' },
    { value: '30', label: '30 days' },
    { value: '0', label: 'No expiry' },
  ];

  job: any | null = null;
  generating = false;
  generatedUrl = '';
  token = '';
  expiresAt: Date | null = null;
  copied: Record<string, boolean> = {};
  selectedJob: any | null = null;
  openDropdownId: string | number | null = null;

  pageSize = 10;
  currentPage = 1;
  searchTerm = '';
  itemsPerPage = 10;
  modal: any
  // view(item: any) {


  //   if (!this.modal) {
  //     const modalEl = document.getElementById('SalaryModal');
  //     this.modal = new bootstrap.Modal(modalEl);
  //   }
  //   this.modal.show();
  // }

  getNormalizedStatus(status: string): string {
    const normalizedStatus = (status || '').toLowerCase();
    return normalizedStatus === 'closed' ? 'close' : normalizedStatus;
  }

  getStatusLabel(status: string): string {
    const normalizedStatus = this.getNormalizedStatus(status);

    switch (normalizedStatus) {
      case 'open':
        return 'Open';
      case 'close':
        return 'Closed';
      case 'draft':
        return 'Draft';
      default:
        return status || '-';
    }
  }

  getStatusBadgeClass(status: string): string {
    const normalizedStatus = this.getNormalizedStatus(status);

    switch (normalizedStatus) {
      case 'open':
        return 'bg-success-subtle text-success border border-success-subtle';
      case 'close':
        return 'bg-danger-subtle text-danger border border-danger-subtle';
      case 'draft':
      default:
        return 'bg-warning-subtle text-warning border border-warning-subtle';
    }
  }

  getCardBorderClass(status: string): string {
    const normalizedStatus = this.getNormalizedStatus(status);

    switch (normalizedStatus) {
      case 'open':
        return 'border-success';
      case 'close':
        return 'border-danger';
      case 'draft':
      default:
        return 'border-warning';
    }
  }

  canPublish(item: any): boolean {
    return this.getNormalizedStatus(item?.status) !== 'open';
  }

  canClose(item: any): boolean {
    return this.getNormalizedStatus(item?.status) === 'open';
  }

  getSkillsList(skills: any): string[] {
    if (Array.isArray(skills)) {
      return skills.filter(Boolean);
    }

    if (typeof skills === 'string' && skills.trim()) {
      return skills
        .split(',')
        .map((skill: string) => skill.trim())
        .filter(Boolean);
    }

    return [];
  }

  viewDetails(item: any): void {
    this.selectedJob = item;
    // If a link was already generated for this job, show it directly
    if (item?.url && item?.token) {
      this.generatedUrl = item.url;
      this.token = item.token;
      this.expiresAt = item.expires_at ? new Date(item.expires_at) : null;
    } else {
      this.generatedUrl = '';
      this.token = '';
      this.expiresAt = null;
    }
    const el = document.getElementById('jobDetailModal');
    if (el) (window as any).bootstrap.Modal.getOrCreateInstance(el).show();
  }

  closeDetailsModal(): void {
    const el = document.getElementById('jobDetailModal');
    if (el) (window as any).bootstrap.Modal.getInstance(el)?.hide();
  }

  toggleDropdown(itemId: string | number, event: Event): void {
    event.stopPropagation();
    this.openDropdownId = this.openDropdownId === itemId ? null : itemId;
  }

  closeDropdown(): void {
    this.openDropdownId = null;
  }

  @HostListener('document:click')
  handleDocumentClick(): void {
    this.closeDropdown();
  }

  getPostedAgoLabel(value: any): string {
    if (!value) return 'Recently posted';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Recently posted';

    const diffMs = Date.now() - date.getTime();
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffDays <= 0) return 'Posted today';
    if (diffDays === 1) return 'Posted 1 day ago';
    return `Posted ${diffDays} days ago`;
  }

  getUpdatedAgoLabel(value: any): string {
    if (!value) return '';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';

    const diffMs = Date.now() - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  }

  getApplicantCount(item: any): number {
    return Number(
      item?.applicantsCount ??
      item?.applicantCount ??
      item?.applicants ??
      item?.application_count ??
      item?.applicationsCount ??
      0
    ) || 0;
  }

  getSalaryLabel(item: any): string {
    const min = item?.min_salary ?? item?.salary_from ?? item?.salaryFrom;
    const max = item?.max_salary ?? item?.salary_to ?? item?.salaryTo;
    const fixed = item?.offered_salary ?? item?.offer_salary ?? item?.salary;

    if (min && max) return `${min} - ${max}`;
    if (fixed) return `${fixed}`;
    return item?.employment_type || '-';
  }

  getWorkLevelLabel(item: any): string {
    return item?.work_level || item?.seniority || item?.experience_level || '-';
  }

  getExperienceLabel(item: any): string {
    return item?.experience || item?.experience_required || item?.minimum_experience || '-';
  }

  getEmploymentTypeLabel(item: any): string {

    return item?.emp_typeData?.name || '-';
  }

  truncateDescription(text: string, limit = 120): string {
    if (!text) return '-';
    const plain = text.replace(/\*/g, '').replace(/\n/g, ' ').trim();
    return plain.length > limit ? plain.slice(0, limit) + '...' : plain;
  }

  parseJobDescription(text: string): string {
    if (!text || !text.trim()) return '-';

    // Escape HTML entities to prevent XSS
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
        if (!inList) { result.push('<ul class="jd-list ps-3 mb-1">'); inList = true; }
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

  publish(data: any, status: any) {
    this.closeDropdown();
    Swal.fire({
      title: "Are you sure?",
      text: `Do you Want to ${status == 'open' ? 'Publish' : 'Close'} this`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: `Yes,  ${status == 'open' ? 'Publish' : 'Close'}  it!`,
      cancelButtonText: "No, cancel!",
      reverseButtons: true
    }).then((result) => {
      if (result.isConfirmed) {
        this.OpenJob(data,status);
      } else if (result.dismiss === Swal.DismissReason.cancel) {

      }
    });



  }
  OpenJob(data: any, status: any) {
    let obj = Object.assign({}, data)

    const payload = {
      id: obj.id,
      status: status
    }
    this.jobService.PublishJob(payload).subscribe(
      (response) => {
        console.log('Employee deleted successfully:', response);
        if (response && response.status === true) {
          this.getJobRequirementList();
          this.notyf.success(response.message || `Job ${status === 'open' ? 'published' : 'closed'} successfully`);
        }
        else if (response && response.status == false) {
          this.notyf.error(response.message || `Failed to ${status === 'open' ? 'publish' : 'close'} job`);
        }
        else {
          this.notyf.error(`Failed to ${status === 'open' ? 'publish' : 'close'} job`);
        }

      },
      (error) => {
        console.error('Error deleting employee:', error);
        this.notyf.error(`Failed to ${status === 'open' ? 'publish' : 'close'} job`);
      }
    )
  }
  onSearch(term: string) {
    if (!term) {
      this.searchText = ''
      this.getJobRequirementList()
    } else {
      this.searchTerm = term.toLowerCase();
      this.currentPage = 1;
      // this.applyFilters();
    }

    // this.loadEmployees()
  }


  onPageChange(page: number) {
    this.currentPage = page;
    // this.applyFilters();
  }

  onPageSizeChange(size: number) {
    this.pageSize = size;
    this.currentPage = 1;
    // this.applyFilters();
  }
  filteredDesignation: any = []
  searchText: any = ''

  async ngOnInit() {
    await this.getJobRequirementList()

  }

  JobRequirementsList: any = []
  originalList: any = []
  jobs: any = []
  obj: any = {}
  // filteredDesignation:any = []
  async getJobRequirementList() {
    this.JobRequirementsList = []
    this.originalList = []
    this.jobs = []
    this.filteredDesignation = []
    let obj={}
    this.jobService.getJobRequirements(obj).subscribe({
      next: (response: any) => {
        console.log('response', response);

        let message = response.message ? response.message : 'Data found Successfully';
        let status = this.statusService.handleResponseStatus(response.status, message);
        console.log(status)
        console.log("response", response);

        if (status == true) {


          // this.notyf.success(message)
          this.JobRequirementsList = response.data
          this.jobs = response.data
          this.originalList = response.data
          // this.selectedJob = this.jobs[0] || null;
          // pagination
          const start = (this.currentPage - 1) * this.pageSize;
          const end = start + this.pageSize;
          this.filteredDesignation = this.JobRequirementsList.slice(start, end);
        }
        else if (status == "expired") {
          this.router.navigate(["login"]);
        }

        else {

          this.notyf.error(message)
        }

      },
      error: (err) => {
        console.error('Error:', err);
        this.notyf.error(err.error?.message)
      }
    });
  }

  buildChannelUrl(channel: string): string {
    return this.generatedUrl + `&utm_source=${channel}`;
  }

  // setOpen() {
  //   if (!this.job) return;
  //   this.jobSvc.update(this.job.id, { ...this.job, status: 'open' })
  //     .subscribe(j => this.job = j);
  // }

  normalizeUrl(url: string): string {
    if (!url) return url;
    return url.replace(/([^:]\/)\/+/g, '$1');
  }

  openJobUrl(url: string): void {
    this.closeDropdown();
    const normalizedUrl = this.normalizeUrl(url);
    if (!normalizedUrl) {
      this.notyf.error('Job URL not available');
      return;
    }

    window.open(normalizedUrl, '_blank', 'noopener,noreferrer');
  }

  copy(text: string, key: string): void {
    text = this.normalizeUrl(text);

    // 1. Try synchronous fallback first — must run in the same click-handler
    //    tick so execCommand has clipboard write permission.
    const syncOk = this.fallbackCopy(text);
    if (syncOk) {
      this.onCopySuccess(key);
      return;
    }

    // 2. Fallback failed (e.g. very modern browser with execCommand removed).
    //    Try the async Clipboard API.
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text)
        .then(() => this.ngZone.run(() => this.onCopySuccess(key)))
        .catch(() => this.ngZone.run(() => this.notyf.error('Could not copy to clipboard')));
    } else {
      this.notyf.error('Could not copy to clipboard');
    }
  }

  private onCopySuccess(key: string): void {
    this.copied[key] = true;
    this.notyf.success('Copied!');
    setTimeout(() => (this.copied[key] = false), 2000);
  }

  private fallbackCopy(text: string): boolean {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'absolute';
    textarea.style.left = '-9999px';
    textarea.style.top = '0';
    // Append inside the open modal (if any) so Bootstrap's focus-trap
    // does not block textarea.focus(), which execCommand requires.
    const container = (document.querySelector('.modal.show') as HTMLElement) || document.body;
    container.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const ok = document.execCommand('copy');
    container.removeChild(textarea);
    return ok;
  }

  generate() {
    const job = this.selectedJob || this.job;
    if (!job) return;
    this.generating = true;

    const token = btoa(job.id + ':' + Date.now()).replace(/=/g, '').substring(0, 24);
    const jobTitle = job.job_title || job.title || 'job';
    const slug = this.obj.slug || jobTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const baseUrl = this.obj.baseUrl?.replace(/\/+$/, '') || window.location.origin;
    const expiresDays = Number(this.obj.expiresDays) || 0;
    const url = `${baseUrl}/${slug}?job_id=${job.id}&token=${token}`;
    const expiresAt = expiresDays > 0
      ? new Date(Date.now() + expiresDays * 86400000)
      : null;

    const payload = {
      job_id: job.id,
      slug,
      base_url: baseUrl,
      token,
      url,
      expires_days: expiresDays,
      expires_at: expiresAt ? expiresAt.toISOString() : null,
    };

    this.jobSvc.saveJobLink(payload).subscribe({
      next: (response: any) => {
        if (response?.status === true) {
          const savedUrl = response.data?.url || url;
          const savedExpiry = response.data?.expires_at
            ? new Date(response.data.expires_at)
            : expiresAt;

          this.token = token;
          this.generatedUrl = savedUrl;
          this.expiresAt = savedExpiry;

          // Persist onto the in-memory job object so reopening the modal
          // shows the link immediately without a new generate call
          if (this.selectedJob) {
            this.selectedJob.url = savedUrl;
            this.selectedJob.token = token;
            this.selectedJob.expires_at = savedExpiry ? savedExpiry.toISOString() : null;
            this.selectedJob.expires_days = expiresDays;
          }

          // Also update the card list so the job card reflects the saved link
          const idx = this.jobs.findIndex((j: any) => j.id === job.id);
          if (idx !== -1) {
            this.jobs[idx] = { ...this.jobs[idx], ...this.selectedJob };
          }

          this.notyf.success('Application link saved successfully');
        } else {
          this.notyf.error(response?.message || 'Failed to save link');
        }
        this.generating = false;
      },
      error: (err: any) => {
        this.notyf.error(err?.error?.message || 'Failed to save link');
        this.generating = false;
      },
    });
  }
}
