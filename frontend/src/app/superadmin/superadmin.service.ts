import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export type TenantStatus = 'active' | 'inactive';
export type SubscriptionStatus = 'active' | 'expired' | 'cancelled';

export interface SubscriptionPayload {
  plan?: string;
  planId?: string;
  status?: SubscriptionStatus;
  startsAt: string; // ISO date string
  endsAt: string; // ISO date string
  seats?: number | null;
  notes?: string | null;
  metadata?: any;
}

export type PlanStatus = 'active' | 'inactive';
export type BillingCycle = 'monthly' | 'yearly' | 'one_time';

export interface PlanMasterPayload {
  name: string;
  code?: string | null;
  price?: number | null;
  billingCycle?: BillingCycle;
  durationDays?: number | null;
  maxUsers?: number | null;
  description?: string | null;
  status?: PlanStatus;
  metadata?: any;
}

@Injectable({
  providedIn: 'root',
})
export class SuperadminService {
  private resolvedBaseUrl(): string {
    const ls = localStorage.getItem('base_url');
    if (ls && ls.trim()) return ls.trim();
    return environment.apiUrl;
  }

  constructor(private http: HttpClient) {}

  private authHeaders(): HttpHeaders {
    const token = localStorage.getItem('superadminToken') || '';
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
  }

  login(payload: { email: string; password: string }): Observable<any> {
    return this.http.post(`${this.resolvedBaseUrl()}superadmin/login`, payload, {
      withCredentials: true,
      responseType: 'text',
    });
  }

  listTenants(): Observable<any> {
    return this.http.get(`${this.resolvedBaseUrl()}superadmin/tenants`, {
      headers: this.authHeaders(),
      withCredentials: true,
      responseType: 'text',
    });
  }

  getStats(): Observable<any> {
    return this.http.get(`${this.resolvedBaseUrl()}superadmin/stats`, {
      headers: this.authHeaders(),
      withCredentials: true,
      responseType: 'text',
    });
  }

  listPlans(): Observable<any> {
    return this.http.get(`${this.resolvedBaseUrl()}superadmin/plans`, {
      headers: this.authHeaders(),
      withCredentials: true,
      responseType: 'text',
    });
  }

  createPlan(payload: PlanMasterPayload): Observable<any> {
    return this.http.post(`${this.resolvedBaseUrl()}superadmin/plans`, payload, {
      headers: this.authHeaders(),
      withCredentials: true,
      responseType: 'text',
    });
  }

  updatePlan(planId: string, payload: Partial<PlanMasterPayload>): Observable<any> {
    return this.http.put(`${this.resolvedBaseUrl()}superadmin/plans/${planId}`, payload, {
      headers: this.authHeaders(),
      withCredentials: true,
      responseType: 'text',
    });
  }

  updatePlanStatus(planId: string, status: PlanStatus): Observable<any> {
    return this.http.patch(
      `${this.resolvedBaseUrl()}superadmin/plans/${planId}/status`,
      { status },
      {
        headers: this.authHeaders(),
        withCredentials: true,
        responseType: 'text',
      },
    );
  }

  updateTenantStatus(tenantId: string, status: TenantStatus): Observable<any> {
    return this.http.patch(
      `${this.resolvedBaseUrl()}superadmin/tenants/${tenantId}/status`,
      { status },
      {
        headers: this.authHeaders(),
        withCredentials: true,
        responseType: 'text',
      },
    );
  }

  upsertSubscription(tenantId: string, payload: SubscriptionPayload): Observable<any> {
    return this.http.put(`${this.resolvedBaseUrl()}superadmin/tenants/${tenantId}/subscription`, payload, {
      headers: this.authHeaders(),
      withCredentials: true,
      responseType: 'text',
    });
  }

  subscriptionHistory(tenantId: string): Observable<any> {
    return this.http.get(`${this.resolvedBaseUrl()}superadmin/tenants/${tenantId}/subscriptions`, {
      headers: this.authHeaders(),
      withCredentials: true,
      responseType: 'text',
    });
  }

  /** Read-only tenant snapshot: employees, leaves, attendance, holidays */
  getTenantCompanySnapshot(tenantId: string): Observable<any> {
    return this.http.get(`${this.resolvedBaseUrl()}superadmin/tenants/${tenantId}/company-snapshot`, {
      headers: this.authHeaders(),
      withCredentials: true,
      responseType: 'text',
    });
  }

  listUsers(params?: { tenantId?: string; status?: string; role?: string; q?: string }): Observable<any> {
    const qp = new URLSearchParams();
    if (params?.tenantId) qp.set('tenantId', params.tenantId);
    if (params?.status) qp.set('status', params.status);
    if (params?.role) qp.set('role', params.role);
    if (params?.q) qp.set('q', params.q);

    const suffix = qp.toString() ? `?${qp.toString()}` : '';
    return this.http.get(`${this.resolvedBaseUrl()}superadmin/users${suffix}`, {
      headers: this.authHeaders(),
      withCredentials: true,
      responseType: 'text',
    });
  }

  updateUser(userId: string, payload: { status?: 'active' | 'inactive'; role?: 'admin' | 'hr' | 'employee'; name?: string }): Observable<any> {
    return this.http.put(`${this.resolvedBaseUrl()}superadmin/users/${userId}`, payload, {
      headers: this.authHeaders(),
      withCredentials: true,
      responseType: 'text',
    });
  }

  getAnalytics(): Observable<any> {
    return this.http.get(`${this.resolvedBaseUrl()}superadmin/analytics`, {
      headers: this.authHeaders(),
      withCredentials: true,
      responseType: 'text',
    });
  }

  getLandingContent(): Observable<string> {
    return this.http.get(`${this.resolvedBaseUrl()}superadmin/landing-content`, {
      headers: this.authHeaders(),
      withCredentials: true,
      responseType: 'text',
    });
  }

  saveLandingContent(content: unknown): Observable<string> {
    return this.http.put(
      `${this.resolvedBaseUrl()}superadmin/landing-content`,
      { content },
      {
        headers: this.authHeaders(),
        withCredentials: true,
        responseType: 'text',
      },
    );
  }

  listContactMessages(params?: { limit?: number; offset?: number }): Observable<string> {
    const qp = new URLSearchParams();
    if (params?.limit != null) qp.set('limit', String(params.limit));
    if (params?.offset != null) qp.set('offset', String(params.offset));
    const suffix = qp.toString() ? `?${qp.toString()}` : '';
    return this.http.get(`${this.resolvedBaseUrl()}superadmin/contact-messages${suffix}`, {
      headers: this.authHeaders(),
      withCredentials: true,
      responseType: 'text',
    });
  }
}

