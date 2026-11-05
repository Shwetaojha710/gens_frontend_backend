import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

/**
 * Expense management API.
 * HR endpoints use the admin token; `my/*` endpoints the employee-portal token
 * (the auth interceptor picks the right one).
 */
@Injectable({ providedIn: 'root' })
export class ExpenseService {
  private readonly base = `${environment.apiUrl}expense/`;

  constructor(private http: HttpClient) {}

  private post(path: string, body: any = {}): Observable<any> {
    return this.http.post(`${this.base}${path}`, body);
  }

  // ── HR: policy ──
  listCategories(): Observable<any> { return this.post('category/list'); }
  saveCategory(data: any): Observable<any> { return this.post('category/save', data); }
  listRules(): Observable<any> { return this.post('rule/list'); }
  saveRule(data: any): Observable<any> { return this.post('rule/save', data); }
  deleteRule(id: string): Observable<any> { return this.post('rule/delete', { id }); }
  getSettings(): Observable<any> { return this.post('settings'); }
  saveSettings(data: any): Observable<any> { return this.post('settings/save', data); }

  // ── HR: claims & reports ──
  listClaims(filters: any): Observable<any> { return this.post('claim/list', filters); }
  claimDetail(id: string): Observable<any> { return this.post('claim/detail', { id }); }
  act(id: string, action: 'approved' | 'rejected', comments: string, override = false): Observable<any> {
    return this.post('claim/act', { id, action, comments, override });
  }
  markPaid(data: any): Observable<any> { return this.post('claim/mark-paid', data); }
  dashboard(filters: any): Observable<any> { return this.post('dashboard', filters); }
  report(filters: any): Observable<any> { return this.post('report', filters); }

  // ── Employee portal ──
  myCategories(): Observable<any> { return this.post('my/categories'); }
  uploadReceipt(file: File): Observable<any> {
    const fd = new FormData();
    fd.append('file', file);
    return this.http.post(`${this.base}my/receipt`, fd);
  }
  validate(items: any[]): Observable<any> { return this.post('my/validate', { items }); }
  submit(data: any): Observable<any> { return this.post('my/submit', data); }
  myClaims(): Observable<any> { return this.post('my/claims'); }
  cancel(id: string): Observable<any> { return this.post('my/cancel', { id }); }
  myClaimDetail(id: string): Observable<any> { return this.post('my/claim-detail', { id }); }
  myApprovals(): Observable<any> { return this.post('my/approvals'); }
  myAct(id: string, action: 'approved' | 'rejected', comments: string): Observable<any> {
    return this.post('my/act', { id, action, comments });
  }
  payables(): Observable<any> { return this.post('my/payables'); }
  myMarkPaid(data: any): Observable<any> { return this.post('my/mark-paid', data); }
}
