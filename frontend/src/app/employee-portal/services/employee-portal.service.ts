import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface EmpPortalUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  branchId: string;
  tenantId: string;
  empCode?: string;
  designation?: string;
}

@Injectable({ providedIn: 'root' })
export class EmployeePortalService {
  private readonly base = environment.apiUrl;

  constructor(private http: HttpClient) {}

  private unwrap<T>(obs: Observable<{ status: unknown; message?: string; data: T }>): Observable<T> {
    return obs.pipe(
      map((res) => {
        const ok = res.status === true || res.status === 'success';
        if (!ok) {
          throw new Error((res as { message?: string }).message || 'Request failed');
        }
        return res.data;
      }),
    );
  }

  /** Raw API envelope (status may be false). */
  sendOtp(
    mobile: string,
    tenantId: string,
  ): Observable<{ status: unknown; message?: string; data?: unknown }> {
    return this.http.post<{ status: unknown; message?: string; data?: unknown }>(
      `${this.base}employee-portal/send-otp`,
      { mobile, tenantId },
    );
  }

  verifyOtp(mobile: string, tenantId: string, otp: string): Observable<Record<string, unknown>> {
    return this.http.post<Record<string, unknown>>(`${this.base}employee-portal/verify-otp`, {
      mobile,
      tenantId,
      otp,
    });
  }

  getEmpDetails(): Observable<unknown> {
    return this.unwrap(this.http.get<{ status: unknown; data: unknown }>(`${this.base}get-Emp-Details`));
  }

  getDailyAttendance(): Observable<unknown> {
    return this.unwrap(
      this.http.post<{ status: unknown; data: unknown }>(`${this.base}get-daily-attendance`, {}),
    );
  }

  getMonthlyAttendance(month: number, year: number): Observable<unknown> {
    return this.unwrap(
      this.http.post<{ status: unknown; data: unknown }>(`${this.base}get-monthly-attendance`, {
        month,
        year,
      }),
    );
  }

  markAttendance(latitude?: number, longitude?: number): Observable<unknown> {
    const fd = new FormData();
    if (latitude != null) fd.append('latitude', String(latitude));
    if (longitude != null) fd.append('longitude', String(longitude));
    return this.unwrap(
      this.http.post<{ status: unknown; data: unknown }>(`${this.base}mark-attendance`, fd),
    );
  }

  getLeaveTypes(): Observable<{ value: string; label: string }[]> {
    return this.unwrap(
      this.http.post<{ status: unknown; data: { value: string; label: string }[] }>(
        `${this.base}get-app-leave-type-dd`,
        {},
      ),
    );
  }

  applyLeave(body: {
    employeeId: string;
    leaveTypeId: string;
    fromDate: string;
    toDate: string;
    reason: string;
    duration_type?: string;
    to_duration_type?: string;
  }): Observable<unknown> {
    return this.unwrap(
      this.http.post<{ status: unknown; data: unknown }>(`${this.base}apply-leaves`, {
        duration_type: 'full',
        to_duration_type: 'full',
        ...body,
      }),
    );
  }

  getAppliedLeaves(month: number, year: number, branchId?: string): Observable<Record<string, unknown>> {
    const body: Record<string, unknown> = { month, year };
    if (branchId) body['branchId'] = branchId;
    return this.http.post<Record<string, unknown>>(`${this.base}get-applied-leave-list`, body);
  }

  getBranches(): Observable<{ id: string; branchName: string }[]> {
    return this.http
      .post<{ status: unknown; data: { id: string; branchName: string }[] }>(`${this.base}app-branch-dd`, {})
      .pipe(map((res) => (Array.isArray(res.data) ? res.data : [])));
  }

  selfDeclineLeave(id: string): Observable<unknown> {
    return this.unwrap(
      this.http.post<{ status: unknown; data: unknown }>(`${this.base}update-apply-leaves-status`, { id, status: 'self_declined' }),
    );
  }

  recommendLeave(id: string): Observable<unknown> {
    return this.unwrap(
      this.http.post<{ status: unknown; data: unknown }>(`${this.base}update-apply-leaves-status`, { id, status: 'recommended' }),
    );
  }

  approveLeave(id: string): Observable<unknown> {
    return this.unwrap(
      this.http.post<{ status: unknown; data: unknown }>(`${this.base}update-apply-leaves-status`, { id, status: 'approved' }),
    );
  }

  declineLeave(id: string): Observable<unknown> {
    return this.unwrap(
      this.http.post<{ status: unknown; data: unknown }>(`${this.base}update-apply-leaves-status`, { id, status: 'rejected' }),
    );
  }

  /**
   * Leave balance per category (leave type): name, code, available_leave, total_leave.
   * Backend: POST get-emp-leave-list → data.leaveBalances
   */
  getLeaveBalanceList(): Observable<Record<string, unknown>[]> {
    return this.http
      .post<{
        status: unknown;
        data?: { leaveBalances?: Record<string, unknown>[] };
      }>(`${this.base}get-emp-leave-list`, {})
      .pipe(
        map((res) => {
          const rows = res.data?.leaveBalances;
          if (res.status === true && Array.isArray(rows)) {
            return rows;
          }
          return [];
        }),
      );
  }

  /**
   * Upcoming approved/pending leaves (fromDate after `date`).
   * Pass yesterday's date (YYYY-MM-DD) so leaves starting today are included (`fromDate > yesterday`).
   * Scope is self-only for employees; includes team for leads/managers per API.
   */
  getUpcomingLeaves(date: string): Observable<Record<string, unknown>[]> {
    return this.http
      .post<{ status: unknown; message?: string; data: unknown }>(`${this.base}UpComming-leave`, {
        date,
      })
      .pipe(
        map((res) => {
          if (res.status === true && Array.isArray(res.data)) {
            return res.data as Record<string, unknown>[];
          }
          return [];
        }),
      );
  }

  getHolidays(): Observable<unknown[]> {
    return this.unwrap(
      this.http.get<{ status: unknown; data: unknown[] }>(`${this.base}get-app-holidayList`),
    );
  }

  getBillDetails(month: number, year: number): Observable<{ status: unknown; message?: string; data?: unknown }> {
    return this.http.post<{ status: unknown; message?: string; data?: unknown }>(
      `${this.base}get-app-bill-details`,
      { month, year },
    );
  }

  printBill(
    month: number,
    year: number,
  ): Observable<{ status: unknown; message?: string; data?: { downloadUrl: string } }> {
    return this.http.post<{ status: unknown; message?: string; data?: { downloadUrl: string } }>(
      `${this.base}print-bill`,
      { month, year },
    );
  }

  logout(): Observable<unknown> {
    return this.http.get(`${this.base}app-logout`, { responseType: 'text' });
  }

  /** Submit attendance regularization (API uses token for employee). */
  createRegularization(body: {
    attendanceDate: string;
    inTimeRequested?: string;
    outTimeRequested?: string;
    reason: string;
  }): Observable<unknown> {
    return this.unwrap(
      this.http.post<{ status: unknown; data: unknown }>(`${this.base}create-regularization`, body),
    );
  }

  /** List current employee regularization requests for a month. */
  getMyRegularizations(month: number, year: number): Observable<Record<string, unknown>[]> {
    return this.http
      .post<{ status: unknown; message?: string; data: unknown }>(`${this.base}regularization-list`, {
        month,
        year,
      })
      .pipe(
        map((res) => {
          if (res.status === true && Array.isArray(res.data)) {
            return res.data as Record<string, unknown>[];
          }
          return [];
        }),
      );
  }

  /** Submit reimbursement with bill images (field name `images` per API). */
  addAppReimbursement(formData: FormData): Observable<unknown> {
    return this.http
      .post<{ status: boolean; message?: string; data?: unknown }>(
        `${this.base}add-app-reimbursement`,
        formData,
      )
      .pipe(
        map((res) => {
          if (!res.status) {
            throw new Error(res.message || 'Could not submit reimbursement');
          }
          return res.data;
        }),
      );
  }

  /** List reimbursements for the logged-in employee (empty list if none). */
  getReimbursementList(): Observable<Record<string, unknown>[]> {
    return this.http
      .get<{ status: unknown; data?: Record<string, unknown>[] }>(`${this.base}reimbursement-list`)
      .pipe(
        map((res) => {
          if (res.status === true && Array.isArray(res.data)) {
            return res.data;
          }
          return [];
        }),
      );
  }

  /**
   * Leave / attendance notifications (same payload as mobile app feed).
   * May return status false when empty — handle in the caller.
   */
  getNotifications(): Observable<{ status: unknown; message?: string; data?: unknown }> {
    return this.http.get<{ status: unknown; message?: string; data?: unknown }>(
      `${this.base}notification`,
    );
  }

  getEmpLetterDocs(): Observable<{ status: unknown; message?: string; data?: unknown }> {
    return this.http.get<{ status: unknown; message?: string; data?: unknown }>(
      `${this.base}get-emp-letter-docs`,
    );
  }

  saveEmpLetterSignature(signature: string): Observable<{ status: unknown; message?: string }> {
    return this.http.post<{ status: unknown; message?: string }>(
      `${this.base}save-emp-letter-signature`,
      { signature },
    );
  }
}
