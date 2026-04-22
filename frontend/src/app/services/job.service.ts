import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  CandidateApplicationRecord,
  CandidatePipelinePayload,
  CandidateScorePayload
} from '../recruitment/recruitment.models';

@Injectable({
  providedIn: 'root'
})
export class JobService {
  private baseUrl = environment.apiUrl || 'http://192.168.23.11:3001/api/';
  private PythonbaseUrl = environment.python_apiUrl || 'http://192.168.23.11:3001/api/';

  constructor(private http: HttpClient) { }

  getBaseUrl(): string {
    const PORT = localStorage.getItem('PORT')?.replace(/["\\,]/g, '') || '3002';
    return window.location.hostname == 'localhost'
      ? localStorage.getItem('base_url')?.replace(/["\\,]/g, '') || ''
      : localStorage.getItem('base_url')?.replace(/["\\,]/g, '') || '';
  }

  ApplyJobRequirement(dept: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}createJobRequirement`, dept);
  }

  updateJobRequirement(dept: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}updateJobRequirement`, dept);
  }

  PublishJob(dept: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}publishJob`, dept);
  }

  getJobRequirements(obj:any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}getJobRequirements`, obj);
  }


  deleteJobRequirement(dept: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}deleteJobRequirement`, dept);
  }

  skillsDD(dept: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}get-skills`, dept);
  }

  getPublicJobPosting(payload: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}public-job-posting`, payload);
  }

  checkDuplicateCandidateApplication(payload: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}check-duplicate-application`, payload);
  }

  submitCandidateApplication(payload: FormData): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}submit-application`, payload);
  }

  getCandidatePipeline(payload: CandidatePipelinePayload = {}): Observable<{ status: boolean; data: CandidateApplicationRecord[] }> {
    return this.http.post<{ status: boolean; data: CandidateApplicationRecord[] }>(
      `${this.baseUrl}admin-pipeline`,
      payload
    );
  }

  getCandidateApplicationById(applicationId: string): Observable<{ status: boolean; data: CandidateApplicationRecord }> {
    return this.http.post<{ status: boolean; data: CandidateApplicationRecord }>(
      `${this.baseUrl}application-detail`,
      { application_id: applicationId }
    );
  }

  saveCandidateAtsScore(payload: CandidateScorePayload): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}save-ats-score`, payload);
  }

  updateCandidateStage(payload: { application_id: string; stage: string; status?: string }): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}update-stage`, payload);
  }

  updateCandidateApplication(payload: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}update-application`, payload);
  }

  uploadCandidateResume(applicationId: string, file: File): Observable<any> {
    const formData = new FormData();
    formData.append('resume', file, file.name);
    formData.append('application_id', applicationId);
    return this.http.post<any>(`${this.baseUrl}update-resume`, formData);
  }

  evaluateResumeFromFile(resumeFile: File, payload: { candidate_id?: string; job_id?: string; job_posting_id?: string; job_description?: any }): Observable<any> {
    const formData = new FormData();
    formData.append('resume', resumeFile, resumeFile.name);
    if (payload.candidate_id) formData.append('candidate_id', payload.candidate_id);
    if (payload.job_id) formData.append('job_id', payload.job_id);
    if (payload.job_posting_id) formData.append('job_posting_id', payload.job_posting_id);
    if (payload.job_description) formData.append('job_description', JSON.stringify(payload.job_description));

    const tenant = JSON.parse(localStorage.getItem('tenant') || '{}');
    const tenantId = tenant.id || tenant.tenantId || tenant.tenant_id || '';

    return this.http.post<any>(
      `${this.PythonbaseUrl}/evaluate-from-resume`,
      formData,
      { headers: { tenantid: tenantId } }
    );
  }

  evaluateResumeFromUrl(payload: { job_post_id: string; job_description: any; resumes: { candidate_id: string; resume_url: string }[] }): Observable<any> {
    const tenant = JSON.parse(localStorage.getItem('tenant') || '{}');
    const tenantId = tenant.id || tenant.tenantId || tenant.tenant_id || '';
    return this.http.post<any>(
      `${this.PythonbaseUrl}/evaluate-batch-from-urls`,
      payload,
      { headers: { tenantid: tenantId } }
    );
  }

  generateLink(jobId: string, baseUrl: string, expiresDays = 21) {
    return this.http.post<{ url: string; token: string; expires: string }>(
      `${baseUrl}/jobs/${jobId}/generate-link`,
      { base_url: baseUrl, expires_days: expiresDays }
    );
  }

  saveRecruitmentOfferLetter(payload: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}save-offer-letter`, payload);
  }

  getRecruitmentOfferLetters(): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}get-offer-letters`, {});
  }

  checkDuplicateOfferLetter(payload: { mobileNo?: string; email?: string; aadhaarNo?: string }): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}check-duplicate-offer-letter`, payload);
  }

  saveJobLink(payload: {
    job_id: string;
    slug: string;
    base_url: string;
    token: string;
    url: string;
    expires_days: number;
    expires_at: string | null;
  }): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}saveJobLink`, payload);
  }
}
