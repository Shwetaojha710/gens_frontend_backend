import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AiHrmsService {
  private baseUrl = environment.aiHrmsApiUrl;

  constructor(private http: HttpClient) {}

  private getTenantId(): string {
    try {
      const raw = localStorage.getItem('tenant') || localStorage.getItem('empPortalTenant') || '{}';
      const t = JSON.parse(raw) as { id?: string; tenantId?: string; tenant_id?: string };
      return String(t.id ?? t.tenantId ?? t.tenant_id ?? '');
    } catch {
      return '';
    }
  }

  private headers(): HttpHeaders {
    return new HttpHeaders({ 'X-Tenant-Id': this.getTenantId() });
  }

  getRootInfo(): Observable<any> {
    return this.http.get(`${this.baseUrl}/`);
  }

  getAttendanceInsights(params: { from_date: string; to_date: string; department_id?: string }): Observable<any> {
    let httpParams = new HttpParams().set('from_date', params.from_date).set('to_date', params.to_date);
    if (params.department_id) {
      httpParams = httpParams.set('department_id', params.department_id);
    }
    return this.http.get(`${this.baseUrl}/api/ai/attendance/insights`, {
      headers: this.headers(),
      params: httpParams,
    });
  }

  getAttritionPredictions(params: { active_only?: boolean; limit?: number; employee_id?: string }): Observable<any> {
    let httpParams = new HttpParams();
    if (params.employee_id) {
      httpParams = httpParams.set('employee_id', params.employee_id);
    } else {
      if (params.active_only != null) httpParams = httpParams.set('active_only', String(params.active_only));
      if (params.limit != null) httpParams = httpParams.set('limit', String(params.limit));
    }
    return this.http.get(`${this.baseUrl}/api/ai/attrition/predict`, {
      headers: this.headers(),
      params: httpParams,
    });
  }

  getPerformanceInsights(employee_id: string): Observable<any> {
    return this.http.post(
      `${this.baseUrl}/api/ai/performance/insights`,
      { employee_id },
      { headers: this.headers() },
    );
  }

  recommendLeave(body: { employee_id: string; duration_days: number; preferred_from: string }): Observable<any> {
    return this.http.post(`${this.baseUrl}/api/ai/leave/recommend`, body, { headers: this.headers() });
  }

  verifyPayroll(body: { employee_id: string; year: number; month: number }): Observable<any> {
    return this.http.post(`${this.baseUrl}/api/ai/payroll/verify`, body, { headers: this.headers() });
  }

  matchCandidates(job_id: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/api/ai/recruitment/match`, { job_id }, { headers: this.headers() });
  }

  getInterviewQuestions(job_id: string, candidate_id: string): Observable<any> {
    return this.http.post(
      `${this.baseUrl}/api/ai/recruitment/interview-questions`,
      { job_id, candidate_id },
      { headers: this.headers() },
    );
  }
}
