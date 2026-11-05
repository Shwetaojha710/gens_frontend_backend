import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

/**
 * Asset management API.
 * HR endpoints use the admin token; `my/*` endpoints the employee-portal token.
 */
@Injectable({ providedIn: 'root' })
export class AssetService {
  private readonly base = `${environment.apiUrl}asset/`;

  constructor(private http: HttpClient) {}

  private post(path: string, body: any = {}): Observable<any> {
    return this.http.post(`${this.base}${path}`, body);
  }

  // ── HR ──
  listCategories(): Observable<any> { return this.post('category/list'); }
  saveCategory(data: any): Observable<any> { return this.post('category/save', data); }
  list(filters: any = {}): Observable<any> { return this.post('list', filters); }
  register(data: any): Observable<any> { return this.post('register', data); }
  update(data: any): Observable<any> { return this.post('update', data); }
  detail(id: string): Observable<any> { return this.post('detail', { id }); }
  setStatus(id: string, status: string, note: string): Observable<any> { return this.post('status', { id, status, note }); }
  scan(token: string): Observable<any> { return this.post('scan', { token }); }
  labels(ids: string[], baseUrl: string): Observable<any> { return this.post('labels', { ids, baseUrl }); }
  allocate(data: any): Observable<any> { return this.post('allocate', data); }
  receiveReturn(data: any): Observable<any> { return this.post('return', data); }
  openMaintenance(data: any): Observable<any> { return this.post('maintenance/open', data); }
  closeMaintenance(data: any): Observable<any> { return this.post('maintenance/close', data); }
  employeeAssets(employeeId: string): Observable<any> { return this.post('employee', { employeeId }); }
  clearance(onlyPending = true): Observable<any> { return this.post('clearance', { onlyPending }); }
  logClearanceOverride(employeeId: string, document: string): Observable<any> {
    return this.post('clearance/override', { employeeId, document });
  }
  dashboard(): Observable<any> { return this.post('dashboard'); }

  // ── Employee portal ──
  myAssets(): Observable<any> { return this.post('my/list'); }
  acknowledge(allocationId: string, action: 'acknowledged' | 'disputed', comment = ''): Observable<any> {
    return this.post('my/acknowledge', { allocationId, action, comment });
  }
  requestReturn(allocationId: string, note: string): Observable<any> {
    return this.post('my/request-return', { allocationId, note });
  }
}
