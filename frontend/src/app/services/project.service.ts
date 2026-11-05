import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

/** Which API family a shared screen talks to: HR panel or employee portal. */
export type PtContext = 'hr' | 'portal';

/**
 * Projects & timesheets API.
 * HR endpoints use the admin token; `my/*` endpoints the employee-portal token.
 */
@Injectable({ providedIn: 'root' })
export class ProjectService {
  private readonly base = `${environment.apiUrl}project/`;

  constructor(private http: HttpClient) {}

  private post(path: string, body: any = {}): Observable<any> {
    return this.http.post(`${this.base}${path}`, body);
  }

  // ── HR ──
  getSettings(): Observable<any> { return this.post('settings'); }
  saveSettings(data: any): Observable<any> { return this.post('settings/save', data); }
  listClients(): Observable<any> { return this.post('client/list'); }
  saveClient(data: any): Observable<any> { return this.post('client/save', data); }
  listProjects(filters: any = {}): Observable<any> { return this.post('list', filters); }
  saveProject(data: any): Observable<any> { return this.post('save', data); }
  listTimesheets(filters: any): Observable<any> { return this.post('timesheet/list', filters); }
  utilization(filters: any): Observable<any> { return this.post('report/utilization', filters); }
  projectReport(filters: any): Observable<any> { return this.post('report/projects', filters); }
  clientReport(filters: any): Observable<any> { return this.post('report/clients', filters); }
  reconciliation(filters: any): Observable<any> { return this.post('report/reconciliation', filters); }

  // ── Portal ──
  myProjects(): Observable<any> { return this.post('my/projects'); }
  colleagues(): Observable<any> { return this.post('my/colleagues'); }
  week(weekStart?: string): Observable<any> { return this.post('my/week', weekStart ? { weekStart } : {}); }
  saveEntry(data: any): Observable<any> { return this.post('my/entry/save', data); }
  deleteEntry(id: string): Observable<any> { return this.post('my/entry/delete', { id }); }
  startTimer(data: any): Observable<any> { return this.post('my/timer/start', data); }
  stopTimer(): Observable<any> { return this.post('my/timer/stop'); }
  submitWeek(weekStart: string): Observable<any> { return this.post('my/submit', { weekStart }); }
  approvals(): Observable<any> { return this.post('my/approvals'); }

  // ── Shared screens (endpoint depends on context) ──
  projectDetail(ctx: PtContext, id: string, range: any = {}): Observable<any> {
    return this.post(ctx === 'hr' ? 'detail' : 'my/project-detail', { id, ...range });
  }
  saveAllocation(ctx: PtContext, data: any): Observable<any> {
    return this.post(ctx === 'hr' ? 'allocation/save' : 'my/allocation/save', data);
  }
  removeAllocation(ctx: PtContext, projectId: string, id: string): Observable<any> {
    return this.post(ctx === 'hr' ? 'allocation/remove' : 'my/allocation/remove', { projectId, id });
  }
  saveTask(ctx: PtContext, data: any): Observable<any> {
    return this.post(ctx === 'hr' ? 'task/save' : 'my/task/save', data);
  }
  deleteTask(ctx: PtContext, projectId: string, id: string): Observable<any> {
    return this.post(ctx === 'hr' ? 'task/delete' : 'my/task/delete', { projectId, id });
  }
  timesheetDetail(ctx: PtContext, id: string): Observable<any> {
    return this.post(ctx === 'hr' ? 'timesheet/detail' : 'my/timesheet-detail', { id });
  }
  actOnTimesheet(ctx: PtContext, id: string, action: 'approved' | 'rejected', comments: string): Observable<any> {
    return this.post(ctx === 'hr' ? 'timesheet/act' : 'my/act', { id, action, comments });
  }
}
