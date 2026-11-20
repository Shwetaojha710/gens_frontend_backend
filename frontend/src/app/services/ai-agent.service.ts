import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

/** WhatsApp AI Customer Relationship Agent API. */
@Injectable({ providedIn: 'root' })
export class AiAgentService {
  private readonly base = `${environment.apiUrl}ai-agent/`;

  constructor(private http: HttpClient) {}

  private post(path: string, body: any = {}): Observable<any> {
    return this.http.post(`${this.base}${path}`, body);
  }

  dashboard(): Observable<any> { return this.post('dashboard'); }
  analytics(): Observable<any> { return this.post('analytics'); }

  getConfig(): Observable<any> { return this.post('config'); }
  saveConfig(data: any): Observable<any> { return this.post('config/save', data); }

  listKnowledge(filters: any = {}): Observable<any> { return this.post('knowledge/list', filters); }
  saveKnowledge(data: any, file?: File): Observable<any> {
    if (file) {
      const fd = new FormData();
      Object.keys(data || {}).forEach((k) => {
        const v = data[k];
        if (v == null) return;
        fd.append(k, typeof v === 'object' ? JSON.stringify(v) : String(v));
      });
      fd.append('file', file);
      return this.http.post(`${this.base}knowledge/save`, fd);
    }
    return this.post('knowledge/save', data);
  }
  toggleKnowledge(id: string, patch: any): Observable<any> {
    return this.post('knowledge/toggle', { id, ...patch });
  }
  deleteKnowledge(id: string): Observable<any> { return this.post('knowledge/delete', { id }); }

  listLeads(filters: any = {}): Observable<any> { return this.post('leads/list', filters); }
  getLead(id: string): Observable<any> { return this.post('leads/get', { id }); }
  /** Create lead; by default auto-sends Meta welcome template to allowlisted phone. */
  createLead(data: any): Observable<any> { return this.post('leads/create', data); }
  /** Send / retry agent welcome template for an existing lead. */
  outreachLead(id: string, force = true): Observable<any> {
    return this.post('leads/outreach', { id, force });
  }
  updateLead(data: any): Observable<any> { return this.post('leads/update', data); }

  listConversations(filters: any = {}): Observable<any> { return this.post('conversations/list', filters); }
  getConversation(id: string): Observable<any> { return this.post('conversations/get', { id }); }
  /** Business-initiated open: send Meta-approved welcome template to allowlisted number. */
  startConversation(phone: string, customerName?: string): Observable<any> {
    return this.post('conversations/start', { phone, customerName });
  }
  toggleAi(id: string, aiEnabled: boolean): Observable<any> {
    return this.post('conversations/toggle-ai', { id, aiEnabled });
  }
  assignConversation(id: string, assignedTo: string | null): Observable<any> {
    return this.post('conversations/assign', { id, assignedTo });
  }
  sendReply(id: string, text: string): Observable<any> {
    return this.post('conversations/reply', { id, text });
  }
  handover(id: string, reason: string, assignedTo?: string): Observable<any> {
    return this.post('conversations/handover', { id, reason, assignedTo });
  }

  listHandovers(filters: any = {}): Observable<any> { return this.post('handovers/list', filters); }
  resolveHandover(id: string, status = 'resolved', notes = ''): Observable<any> {
    return this.post('handovers/resolve', { id, status, notes });
  }

  simulate(text: string, waId: string, customerName?: string): Observable<any> {
    return this.post('simulate', { text, waId, customerName });
  }
}
