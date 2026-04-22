// Stage pipeline order — index reflects how far along a candidate is.
// ATS evaluation must NEVER move a candidate backward in this order.
const STAGE_ORDER: string[] = [
  'candidate_applied',
  'ats_screening',
  'shortlisted',
  'interview_scheduled',
  'interview_in_progress',
  'offered',
  'closed',
  'rejected',
];

function stageIndex(stage: string): number {
  const idx = STAGE_ORDER.indexOf(stage);
  return idx === -1 ? 0 : idx;
}

import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { JobService } from '../../services/job.service';
import { RecruitmentStageKey, CandidateApplicationRecord, CandidatePipelinePayload, InterviewPanelUser } from '../recruitment.models';
import { StatusService } from '../../services/status.service';
import { ActivatedRoute, Router } from '@angular/router';
import { SearchPaginationComponent } from '../../master/search-pagination/search-pagination.component';
import { InterviewService } from '../../services/interview.service';
import { Notyf } from 'notyf';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-application-list',
  standalone: true,
  imports: [CommonModule, FormsModule, SearchPaginationComponent],
  templateUrl: './application-list.component.html',
  styleUrls: ['./application-list.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ApplicationListComponent implements OnInit {
  applications: CandidateApplicationRecord[] = [];
  allApplications: CandidateApplicationRecord[] = [];
  filteredApps: CandidateApplicationRecord[] = [];
  selectedApp: CandidateApplicationRecord | null = null;
  selectedDetailApp: CandidateApplicationRecord | null = null;
  loadingDetail = false;
  isLoading = false;
  isSaving = false;
  searchTerm = '';
  currentPage = 1;
  itemsPerPage = 10;
  totalItems = 0;
  obj: CandidatePipelinePayload = {};
  activeStageFilter = 'all';
  activeDepartmentFilter = '';
  activeJobTitleFilter = '';
  uniqueDepartments: string[] = [];
  uniqueJobTitles: string[] = [];

  stageFilters = [
    { key: 'all',                   label: 'All',                   icon: 'fas fa-th-list',        dotColor: '#3b82f6' },
    { key: 'candidate_applied',     label: 'Applied',               icon: 'fas fa-user-plus',      dotColor: '#8b5cf6' },
    { key: 'ats_screening',         label: 'ATS Screening',         icon: 'fas fa-robot',          dotColor: '#f59e0b' },
    { key: 'shortlisted',           label: 'Shortlisted',           icon: 'fas fa-check-circle',   dotColor: '#22c55e' },
    { key: 'interview_scheduled',   label: 'Interview Scheduled',   icon: 'fas fa-calendar-check', dotColor: '#0ea5e9' },
    { key: 'interview_in_progress', label: 'Interview In Progress', icon: 'fas fa-comments',       dotColor: '#a855f7' },
    { key: 'offered',               label: 'Offered',               icon: 'fas fa-handshake',      dotColor: '#16a34a' },
    { key: 'rejected',              label: 'Rejected',              icon: 'fas fa-times-circle',   dotColor: '#ef4444' },
  ];

  editObj: any = {};
  notyf = new Notyf();

  // Resume upload in edit modal
  editResumeFile: File | null = null;
  editResumeFileName = '';
  isUploadingResume = false;

  // Assign interviewer
  panelUsers: InterviewPanelUser[] = [];
  interviewRounds: any[] = [];
  assignApp: CandidateApplicationRecord | null = null;
  isAssigning = false;

  // Per-round assignment
  roundAssignments: Array<{
    round_id: string | number;
    round_name: string;
    panel_user_id: string | number | null;
    scheduled_at: string;
    duration_minutes: number | null;
    mode: string;
    meeting_link: string;
    status: string;
    feedback_submitted: boolean;
  }> = [];

  sameInterviewerForAll = false;
  commonAssignFields: {
    panel_user_id: string | number | null;
    scheduled_at: string;
    duration_minutes: number | null;
    mode: string;
    meeting_link: string;
  } = { panel_user_id: null, scheduled_at: '', duration_minutes: null, mode: '', meeting_link: '' };

  constructor(
    private jobService: JobService,
    private statusService: StatusService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
    private interviewService: InterviewService
  ) {}

  ngOnInit(): void {
    const params = this.route.snapshot.queryParamMap;
    const dept = params.get('department');
    if (dept) {
      this.activeDepartmentFilter = dept;
    }
    const stage = params.get('stage');
    if (stage) {
      this.activeStageFilter = stage;
    }
    this.loadApplications();
    this.loadPanelUsers();
    this.loadInterviewRounds();
  }

  loadApplications(): void {
    this.isLoading = true;
    this.jobService.getCandidatePipeline(this.obj).subscribe({
      next: (res) => {
        const status = this.statusService.handleResponseStatus(res.status, 'OK');
        if (status === true) {
          this.allApplications = res.data || [];
          this.applications = [...this.allApplications];
          this.uniqueDepartments = [...new Set(
            this.allApplications.map(a => a.department || '').filter(Boolean)
          )].sort() as string[];
          this.uniqueJobTitles = [...new Set(
            this.allApplications.map(a => a.job_title || '').filter(Boolean)
          )].sort();
          this.applyFilter();
        } else if (status === 'expired') {
          this.router.navigate(['login']);
        }
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  setStageFilter(key: string): void {
    this.activeStageFilter = key;
    this.currentPage = 1;
    this.applyFilter();
  }

  // Returns applications filtered by dept + job title only (no stage/search).
  // Used by both getStageCount() and applyFilter() so chip counts always
  // reflect the active dept/job selection.
  private getBaseFiltered(): CandidateApplicationRecord[] {
    let base = [...this.allApplications];
    if (this.activeDepartmentFilter) {
      base = base.filter(a => a.department === this.activeDepartmentFilter);
    }
    if (this.activeJobTitleFilter) {
      base = base.filter(a => a.job_title === this.activeJobTitleFilter);
    }
    return base;
  }

  getStageCount(key: string): number {
    const base = this.getBaseFiltered();
    if (key === 'all') return base.length;
    return base.filter(a => a.stage === key).length;
  }

  loadPanelUsers(): void {
    this.interviewService.listInterviewPanelUsers().subscribe({
      next: (res) => {
        if (res.status) {
          this.panelUsers = res.data || [];
          this.cdr.markForCheck();
        }
      }
    });
  }

  loadInterviewRounds(): void {
    this.interviewService.getInterviewRound().subscribe({
      next: (res) => {
        if (res.status) {
          this.interviewRounds = res.data || [];
          this.cdr.markForCheck();
        }
      }
    });
  }

  onSearch(term: string): void {
    this.searchTerm = term.toLowerCase();
    this.applyFilter();
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.applyFilter();
  }

  onPageSizeChange(size: number): void {
    this.itemsPerPage = size;
    this.currentPage = 1;
    this.applyFilter();
  }

  onDepartmentFilterChange(): void {
    this.currentPage = 1;
    this.applyFilter();
  }

  onJobTitleFilterChange(): void {
    this.currentPage = 1;
    this.applyFilter();
  }

  clearDropdownFilters(): void {
    this.activeDepartmentFilter = '';
    this.activeJobTitleFilter = '';
    this.currentPage = 1;
    this.applyFilter();
  }

  private applyFilter(): void {
    // Start from dept+job-title base (same as chip counts)
    let filtered = this.getBaseFiltered();

    // Stage filter
    if (this.activeStageFilter !== 'all') {
      filtered = filtered.filter(app => app.stage === this.activeStageFilter);
    }

    // Search filter
    if (this.searchTerm) {
      filtered = filtered.filter(app =>
        `${app.name} ${app.job_title} ${app.email} ${app.phone}`.toLowerCase().includes(this.searchTerm)
      );
    }

    this.applications = filtered;
    this.totalItems = filtered.length;

    // Pagination
    const start = (this.currentPage - 1) * this.itemsPerPage;
    this.filteredApps = filtered.slice(start, start + this.itemsPerPage);

    this.cdr.markForCheck();
  }

  getStageBadgeClass(stage: string): { [key: string]: boolean } {
    const badges: Record<string, string> = {
      'candidate_applied': 'bg-label-primary',
      'ats_screening': 'bg-label-info',
      'shortlisted': 'bg-label-success',
      'interview_scheduled': 'bg-label-warning',
      'interview_in_progress': 'bg-label-warning',
      'offered': 'bg-label-success',
      'closed': 'bg-label-danger',
      'rejected': 'bg-label-danger',
    };
    return { [`${badges[stage] || 'bg-label-secondary'} rounded-pill px-2 py-1 text-xs fw-semibold`]: true };
  }

  async viewApplication(app: CandidateApplicationRecord): Promise<void> {
    this.loadingDetail = true;
    this.selectedDetailApp = null;
    this.selectedApp = app;
    this.cdr.markForCheck();

    try {
      const res = await this.jobService.getCandidateApplicationById(app.id).toPromise();
      if (res?.status) {
        this.selectedDetailApp = res.data;
        this.cdr.markForCheck();
      }
    } catch (error) {
      console.error('Error fetching application details:', error);
    } finally {
      this.loadingDetail = false;
      this.openModal();
      this.cdr.markForCheck();
    }
  }


  editApplication(app: CandidateApplicationRecord): void {
    this.editObj = {
      application_id: app.id,
      name: app.name,
      email: app.email,
      phone: app.phone,
      current_company: app.current_company || '',
      last_company: (app as any).last_company || '',
      experience: app.experience,
      current_ctc: app.current_ctc,
      expected_ctc: app.expected_ctc,
      notice_period: app.notice_period,
      current_location: (app as any).current_location || '',
      relocate: (app as any).relocate || '',
      relocateEnabled: !!(app as any).relocate || false,
      home_town: (app as any).home_town || '',
      skills: Array.isArray(app.skills) ? app.skills.join(', ') : (app.skills || ''),
      roles_and_responsibilities: (app as any).roles_and_responsibilities || '',
      project: (app as any).project || '',
      tools: (app as any).tools || '',
      offer_in_hand: (app as any).offer_in_hand || '',
      offerInHandEnabled: !!(app as any).offer_in_hand || false,
      family_background: (app as any).family_background || '',
      highest_qualification: (app as any).highest_qualification || '',
      remark: (app as any).remark || '',
    };

    this.openEditModal();
  }

  openEditModal(): void {
    const el = document.getElementById('editApplicationModal');
    if (el) (window as any).bootstrap.Modal.getOrCreateInstance(el).show();
  }

  closeEditModal(): void {
    const el = document.getElementById('editApplicationModal');
    if (el) {
      const m = (window as any).bootstrap.Modal.getInstance(el);
      if (m) m.hide();
    }
    this.editObj = { relocateEnabled: false, offerInHandEnabled: false };
    this.editResumeFile = null;
    this.editResumeFileName = '';
    this.cdr.markForCheck();
  }

  onEditResumeSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] || null;
    this.editResumeFile = file;
    this.editResumeFileName = file?.name || '';
    this.cdr.markForCheck();
  }

  private uploadAndEvaluateResume(app: CandidateApplicationRecord): void {
    if (!this.editResumeFile) return;
    this.isUploadingResume = true;
    this.cdr.markForCheck();

    // Step 1: upload the resume file
    this.jobService.uploadCandidateResume(app.id, this.editResumeFile).subscribe({
      next: () => {
        // Step 2: run ATS evaluation
        const jobDescription = {
          job_title: app.job_title,
          department: (app as any).department,
          skills: app.skills,
          experience: app.experience
        };
        this.jobService.evaluateResumeFromFile(this.editResumeFile!, {
          candidate_id: app.candidate_id || app.id,
          job_id: app.job_id,
          job_posting_id: app.job_posting_id,
          job_description: jobDescription
        }).subscribe({
          next: (res: any) => {
            const normalized = this.normalizeAtsResult(res);
            if (normalized && !normalized._error) {
              const score = normalized.overall_score ?? normalized.breakdown?.skills?.score ?? null;
              if (score !== null) {
                // Step 3: save ATS score — preserve stage if already ahead of ats_screening
                const skipStageUpdate = stageIndex(app.stage) > stageIndex('ats_screening');
                this.jobService.saveCandidateAtsScore({
                  application_id: app.id,
                  ats_score: score,
                  matched_skills: normalized.breakdown?.skills?.matched || [],
                  missing_skills: normalized.breakdown?.skills?.missing || [],
                  summary: normalized.final_summary || '',
                  skip_stage_update: skipStageUpdate
                } as any).subscribe({
                  next: () => {
                    this.notyf.success(`Resume uploaded & ATS score updated: ${Math.round(score)}`);
                    this.loadApplications();
                    this.isUploadingResume = false;
                    this.editResumeFile = null;
                    this.editResumeFileName = '';
                    this.cdr.markForCheck();
                  },
                  error: () => {
                    this.notyf.error('Resume uploaded but ATS score save failed');
                    this.isUploadingResume = false;
                    this.cdr.markForCheck();
                  }
                });
              } else {
                this.notyf.success('Resume uploaded successfully');
                this.loadApplications();
                this.isUploadingResume = false;
                this.cdr.markForCheck();
              }
            } else {
              this.notyf.error(normalized?._error || 'ATS evaluation failed after resume upload');
              this.isUploadingResume = false;
              this.cdr.markForCheck();
            }
          },
          error: () => {
            this.notyf.error('Resume uploaded but ATS evaluation failed');
            this.isUploadingResume = false;
            this.cdr.markForCheck();
          }
        });
      },
      error: (err: any) => {
        this.notyf.error(err?.error?.message || 'Resume upload failed');
        this.isUploadingResume = false;
        this.cdr.markForCheck();
      }
    });
  }


  saveEdit(): void {
    if (!this.editObj.name?.trim() || !this.editObj.email?.trim() || !this.editObj.phone?.trim()) {
      this.notyf.error('Name, email and phone are required');
      return;
    }

    const payload = {
      ...this.editObj,
      skills: this.editObj.skills
        ? String(this.editObj.skills).split(',').map((s: string) => s.trim()).filter(Boolean)
        : [],
      relocate: this.editObj.relocateEnabled ? (this.editObj.relocate || null) : null,
      offer_in_hand: this.editObj.offerInHandEnabled ? (this.editObj.offer_in_hand || null) : null,
    };


    this.isSaving = true;
    this.cdr.markForCheck();

    this.jobService.updateCandidateApplication(payload).subscribe({
      next: (res: any) => {
        const status = this.statusService.handleResponseStatus(res.status, res.message);
        if (status === true) {
          this.notyf.success(res.message || 'Application updated successfully');
          const appForResume = this.allApplications.find(a => a.id === this.editObj.application_id) || null;
          const pendingResumeFile = this.editResumeFile;
          this.closeEditModal();
          this.loadApplications();
          if (pendingResumeFile && appForResume) {
            this.editResumeFile = pendingResumeFile;
            this.uploadAndEvaluateResume(appForResume);
          }
        } else if (status === 'expired') {
          this.router.navigate(['login']);
        } else {
          this.notyf.error(res.message || 'Update failed');
        }
        this.isSaving = false;
        this.cdr.markForCheck();
      },
      error: (err: any) => {
        this.notyf.error(err?.error?.message || 'Error updating application');
        this.isSaving = false;
        this.cdr.markForCheck();
      }
    });
  }

  openModal(): void {
    const modalElement = document.getElementById('applicationDetailsModal');
    if (modalElement) {
      const modal = (window as any).bootstrap.Modal.getOrCreateInstance(modalElement);
      modal.show();
    }
  }

  closeModal(): void {
    const modalElement = document.getElementById('applicationDetailsModal');
    if (modalElement) {
      const modal = (window as any).bootstrap.Modal.getInstance(modalElement);
      if (modal) modal.hide();
    }
    this.selectedDetailApp = null;
    this.cdr.markForCheck();
  }

  getStageDisplay(stage: RecruitmentStageKey): string {
    const display: Record<RecruitmentStageKey, string> = {
      'job_requirement': 'Job Requirement',
      'posting': 'Posting',
      'candidate_applied': 'Candidate Applied',
      'ats_screening': 'ATS Screening',
      'shortlisted': 'Shortlisted',
      'interview_scheduled': 'Interview Scheduled',
      'interview_in_progress': 'Interview In Progress',
      'offered': 'Offered',
      'closed': 'Closed',
      'rejected': 'Rejected'
    };
    return display[stage] || stage.replace('_', ' ').toUpperCase();
  }

  // Returns true if moving to targetStage is a valid forward step.
  // 'rejected' is allowed from any active stage except closed/offered/rejected.
  canAdvanceTo(app: CandidateApplicationRecord, targetStage: string): boolean {
    const currentIdx = stageIndex(app.stage);
    if (targetStage === 'rejected') {
      return !['closed', 'offered', 'rejected'].includes(app.stage);
    }
    const targetIdx = stageIndex(targetStage);
    return targetIdx > currentIdx;
  }

  updateStage(app: CandidateApplicationRecord, stage: string): void {
    if (!this.canAdvanceTo(app, stage)) {
      const currentLabel = this.getStageDisplay(app.stage as RecruitmentStageKey);
      const targetLabel = this.getStageDisplay(stage as RecruitmentStageKey);
      this.notyf.error(`Cannot move to "${targetLabel}" — current stage is already "${currentLabel}"`);
      return;
    }
    const payload = { application_id: app.id, stage: stage as RecruitmentStageKey };
    this.jobService.updateCandidateStage(payload).subscribe({
      next: (res) => {
        this.statusService.handleResponseStatus(res.status, 'Stage updated');
        this.loadApplications();
      }
    });
  }

  // ATS Resume Evaluate (file upload)
  atsApp: CandidateApplicationRecord | null = null;
  atsFile: File | null = null;
  atsFileName = '';
  atsResult: any = null;
  isEvaluating = false;

  // ATS Evaluate by Resume URL
  atsUrlApp: CandidateApplicationRecord | null = null;
  atsUrlResult: any = null;
  isUrlEvaluating = false;

  // Normalize any ATS response shape to the new structure
  normalizeAtsResult(raw: any): any {
    if (!raw) return null;
    let r = raw?.data ?? raw;
    // URL response: { results: [...], errors: [...], count, job_post_id }
    if (Array.isArray(r?.results) && r.results.length > 0) {
      r = r.results[0];
    } else if (Array.isArray(r?.errors) && r.errors.length > 0) {
      // evaluation failed — return an error marker
      return { _error: r.errors[0]?.error || 'Evaluation failed', _resumeUrl: r.errors[0]?.resume_url };
    }
    // already new format
    if (r?.overall_score !== undefined) return r;
    // legacy format — map old fields to new structure
    return {
      overall_score: r?.ats_score ?? r?.final_score ?? null,
      match_level: null,
      breakdown: {
        skills: {
          score: r?.ats_score ?? null,
          matched: r?.matched_skills ?? [],
          missing: r?.missing_skills ?? [],
          extra: []
        },
        experience: { score: null, details: `${r?.experience_years ?? ''} years` },
        education: { score: null, details: '' },
        keywords: { score: null, matched: [], missing: [] },
        certifications: { score: null, details: '' }
      },
      strengths: [],
      weaknesses: [],
      recommendations: [],
      final_summary: r?.summary ?? ''
    };
  }

  getMatchLevelClass(level: string): string {
    switch ((level || '').toLowerCase()) {
      case 'high':   return 'text-success';
      case 'medium': return 'text-warning';
      case 'low':    return 'text-danger';
      default:       return 'text-secondary';
    }
  }

  getScoreBarClass(score: number): string {
    if (score >= 75) return 'bg-success';
    if (score >= 50) return 'bg-warning';
    return 'bg-danger';
  }

  openAtsModal(app: CandidateApplicationRecord): void {
    this.atsApp = app;
    this.atsFile = null;
    this.atsFileName = '';
    this.atsResult = null;
    this.isEvaluating = false;
    this.cdr.markForCheck();
    const el = document.getElementById('atsEvaluateModal');
    if (el) (window as any).bootstrap.Modal.getOrCreateInstance(el).show();
  }

  closeAtsModal(): void {
    const el = document.getElementById('atsEvaluateModal');
    if (el) (window as any).bootstrap.Modal.getInstance(el)?.hide();
    this.atsApp = null;
    this.atsFile = null;
    this.atsFileName = '';
    this.atsResult = null;
    this.cdr.markForCheck();
  }

  onAtsFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] || null;
    this.atsFile = file;
    this.atsFileName = file?.name || '';
    this.atsResult = null;
    this.cdr.markForCheck();
  }

  runAtsEvaluate(): void {
    if (!this.atsFile) {
      this.notyf.error('Please select a resume file');
      return;
    }
    this.isEvaluating = true;
    this.atsResult = null;
    this.cdr.markForCheck();

    const jobDescription = this.atsApp ? {
      job_title: this.atsApp.job_title,
      department: (this.atsApp as any).department,
      skills: this.atsApp.skills,
      experience: this.atsApp.experience
    } : undefined;

    this.jobService.evaluateResumeFromFile(this.atsFile, {
      candidate_id: this.atsApp?.candidate_id || this.atsApp?.id,
      job_id: this.atsApp?.job_id,
      job_posting_id: this.atsApp?.job_posting_id,
      job_description: jobDescription
    }).subscribe({
      next: (res: any) => {
        this.atsResult = res;
        this.isEvaluating = false;
        this.cdr.markForCheck();
        this.saveAtsScoreToList(this.atsApp!, res);
      },
      error: (err: any) => {
        this.notyf.error(err?.error?.message || 'ATS evaluation failed');
        this.isEvaluating = false;
        this.cdr.markForCheck();
      }
    });
  }

  saveAtsScoreToList(app: CandidateApplicationRecord, res: any): void {
    const normalized = this.normalizeAtsResult(res);
    if (!normalized || normalized._error) return;
    const score = normalized.overall_score ?? normalized.breakdown?.skills?.score ?? null;
    if (score === null) return;

    // If the candidate is already beyond ats_screening, do NOT downgrade the stage.
    const skipStageUpdate = stageIndex(app.stage) > stageIndex('ats_screening');

    this.jobService.saveCandidateAtsScore({
      application_id: app.id,
      ats_score: score,
      matched_skills: normalized.breakdown?.skills?.matched || [],
      missing_skills: normalized.breakdown?.skills?.missing || [],
      summary: normalized.final_summary || '',
      skip_stage_update: skipStageUpdate
    } as any).subscribe({
      next: () => {
        this.notyf.success(`ATS score saved: ${Math.round(score)}`);
        this.loadApplications();
      },
      error: () => {
        this.notyf.error('ATS score save failed');
      }
    });
  }

  openAtsUrlModal(app: CandidateApplicationRecord): void {
    this.atsUrlApp = app;
    this.atsUrlResult = null;
    this.isUrlEvaluating = false;
    this.cdr.markForCheck();
    const el = document.getElementById('atsUrlEvaluateModal');
    if (el) (window as any).bootstrap.Modal.getOrCreateInstance(el).show();
  }

  closeAtsUrlModal(): void {
    const el = document.getElementById('atsUrlEvaluateModal');
    if (el) (window as any).bootstrap.Modal.getInstance(el)?.hide();
    this.atsUrlApp = null;
    this.atsUrlResult = null;
    this.cdr.markForCheck();
  }

  runAtsEvaluateByUrl(): void {
    if (!this.atsUrlApp?.resume_url) {
      this.notyf.error('No resume URL available for this candidate');
      return;
    }

    this.isUrlEvaluating = true;
    this.atsUrlResult = null;
    this.cdr.markForCheck();

    const jobDescription = {
      job_title: this.atsUrlApp.job_title,
      department: (this.atsUrlApp as any).department,
      skills: this.atsUrlApp.skills,
      experience: this.atsUrlApp.experience
    };

    this.jobService.evaluateResumeFromUrl({
      job_post_id: this.atsUrlApp.job_posting_id!,
      job_description: jobDescription,
      resumes: [{ candidate_id: this.atsUrlApp.candidate_id || this.atsUrlApp.id, resume_url: this.atsUrlApp.resume_url! }]
    }).subscribe({
      next: (res: any) => {
        this.atsUrlResult = res;
        this.isUrlEvaluating = false;
        this.cdr.markForCheck();
        this.saveAtsScoreToList(this.atsUrlApp!, res);
      },
      error: (err: any) => {
        this.notyf.error(err?.error?.message || 'ATS URL evaluation failed');
        this.isUrlEvaluating = false;
        this.cdr.markForCheck();
      }
    });
  }

  getInterviewerPhone(round: any): string {
    if (round?.interviewer_phone) return round.interviewer_phone;
    if (!round?.interviewer_id) return '';
    const user = this.panelUsers.find(u => String(u.id) === String(round.interviewer_id));
    return user?.mobile_no || '';
  }

  // Quick actions
  shortlist(app: CandidateApplicationRecord): void {
    if (app.stage !== 'ats_screening') {
      this.notyf.error('ATS screening must be completed before shortlisting');
      return;
    }
    this.updateStage(app, 'shortlisted');
  }

  reject(app: CandidateApplicationRecord): void {
    if (!this.canAdvanceTo(app, 'rejected')) {
      this.notyf.error('This candidate cannot be rejected at their current stage');
      return;
    }
    this.updateStage(app, 'rejected');
  }

  // Assign interviewer
  openAssignModal(app: CandidateApplicationRecord): void {
    this.assignApp = app;
    this.sameInterviewerForAll = false;
    this.commonAssignFields = { panel_user_id: null, scheduled_at: '', duration_minutes: null, mode: '', meeting_link: '' };

    // Use interview_rounds already present in the application (from admin-pipeline API)
    const rounds: any[] = app.interview_rounds || [];
    this.roundAssignments = rounds.map(r => ({
      round_id: r.round_id,
      round_name: r.round_name,
      panel_user_id: r.interviewer_id || null,
      scheduled_at: r.scheduled_at || '',
      duration_minutes: r.duration_minutes || null,
      mode: r.mode || '',
      meeting_link: r.meeting_link || '',
      status: r.status || 'pending',
      feedback_submitted: r.feedback_submitted || false
    }));

    this.cdr.markForCheck();
    const el = document.getElementById('assignInterviewerModal');
    if (el) (window as any).bootstrap.Modal.getOrCreateInstance(el).show();
  }

  closeAssignModal(): void {
    const el = document.getElementById('assignInterviewerModal');
    if (el) {
      const m = (window as any).bootstrap.Modal.getInstance(el);
      if (m) m.hide();
    }
    this.assignApp = null;
    this.roundAssignments = [];
    this.sameInterviewerForAll = false;
    this.commonAssignFields = { panel_user_id: null, scheduled_at: '', duration_minutes: null, mode: '', meeting_link: '' };
    this.cdr.markForCheck();
  }

  applyCommonToAll(): void {
    this.roundAssignments = this.roundAssignments.map(r => ({
      ...r,
      panel_user_id: this.commonAssignFields.panel_user_id ?? r.panel_user_id,
      scheduled_at: this.commonAssignFields.scheduled_at || r.scheduled_at,
      duration_minutes: this.commonAssignFields.duration_minutes ?? r.duration_minutes,
      mode: this.commonAssignFields.mode || r.mode,
      meeting_link: this.commonAssignFields.meeting_link || r.meeting_link
    }));
    this.cdr.markForCheck();
  }

  onSameForAllToggle(): void {
    if (this.sameInterviewerForAll) {
      // Auto-apply immediately when toggled on
      this.applyCommonToAll();
    }
  }

  onCommonFieldChange(): void {
    // Auto-propagate to all rounds whenever a common field changes
    if (this.sameInterviewerForAll) {
      this.applyCommonToAll();
    }
  }

  confirmAssign(): void {
    if (!this.assignApp) return;

    const toAssign = this.roundAssignments.filter(r => r.panel_user_id);
    if (toAssign.length === 0) {
      this.notyf.error('Please select at least one interviewer');
      return;
    }

    this.isAssigning = true;
    this.cdr.markForCheck();

    const calls = toAssign.map(r =>
      this.interviewService.assignInterviewer({
        application_id: this.assignApp!.id,
        panel_user_id: r.panel_user_id!,
        round_id: r.round_id,
        scheduled_at: r.scheduled_at || null,
        duration_minutes: r.duration_minutes,
        mode: r.mode || null,
        meeting_link: r.meeting_link || null
      })
    );

    forkJoin(calls).subscribe({
      next: () => {
        // After assigning, determine the new stage:
        // If every round is completed with feedback → offered
        // Otherwise → interview_scheduled
        const allDone = this.roundAssignments.length > 0 &&
          this.roundAssignments.every(r => r.feedback_submitted || r.status === 'completed');
        const newStage = allDone ? 'offered' : 'interview_scheduled';
        this.updateStage(this.assignApp!, newStage);

        this.notyf.success(`${toAssign.length} round(s) assigned — stage updated to ${newStage.replace('_', ' ')}`);

        // Send interview invitation mail to candidate & interviewer for each assigned round
        this.sendInterviewMails(toAssign);

        this.closeAssignModal();
        this.loadApplications();
        this.isAssigning = false;
        this.cdr.markForCheck();
      },
      error: (err: any) => {
        this.notyf.error(err?.error?.message || 'Error assigning interviewers');
        this.isAssigning = false;
        this.cdr.markForCheck();
      }
    });
  }

  private sendInterviewMails(assignedRounds: typeof this.roundAssignments): void {
    if (!this.assignApp) return;

    const app = this.assignApp;
    const mailCalls = assignedRounds
      .filter(r => r.panel_user_id)
      .map(r => {
        const interviewer = this.panelUsers.find(u => String(u.id) === String(r.panel_user_id));
        if (!interviewer?.email) return null;

        return this.interviewService.sendInterviewMail({
          application_id: app.id,
          candidate_name: app.name,
          candidate_email: app.email,
          interviewer_name: `${interviewer.first_name} ${interviewer.last_name}`.trim(),
          interviewer_email: interviewer.email,
          round_name: r.round_name,
          job_title: app.job_title,
          scheduled_at: r.scheduled_at || null,
          duration_minutes: r.duration_minutes,
          mode: r.mode,
          meeting_link: r.meeting_link
        });
      })
      .filter(Boolean) as ReturnType<typeof this.interviewService.sendInterviewMail>[];

    if (!mailCalls.length) return;

    forkJoin(mailCalls).subscribe({
      next: () => this.notyf.success('Interview invitation sent to candidate & interviewer(s)'),
      error: () => this.notyf.error('Interview assigned but email notification failed')
    });
  }
}
