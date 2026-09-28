import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface WebsiteChatBody {
  message: string;
  session_id: string;
  user_id?: string;
  source?: 'web_widget';
}

export interface WebsiteChatActionBody {
  action_label: string;
  action_type: string;
  session_id: string;
  user_id?: string;
  source?: 'web_widget';
  chat_log_id?: number;
}

export interface BookingStartBody {
  session_id: string;
  user_id?: string;
  source?: 'web_widget';
  chat_log_id?: number;
}

export interface BookingStepBody {
  session_id: string;
  value: string;
  field: string;
}

export interface UpdateBookingStatusBody {
  status: 'in_progress' | 'booked' | 'cancelled' | 'contacted';
}

export interface ReportDateRange {
  from?: string;
  to?: string;
}

@Injectable({
  providedIn: 'root',
})
export class GensWebsiteChatService {
  private readonly baseUrl = environment.aiHrmsApiUrl; // http://192.168.23.19:8000

  constructor(private readonly http: HttpClient) {}

  // ─── Health & Info ────────────────────────────────────────────────────────

  /** GET / */
  getRoot(): Observable<any> {
    return this.http.get(`${this.baseUrl}/`);
  }

  /** GET /health */
  getHealth(): Observable<any> {
    return this.http.get(`${this.baseUrl}/health`);
  }

  // ─── Chat ───────────────────────────────────────────────────────────────

  /** POST /chat */
  chat(body: WebsiteChatBody): Observable<any> {
    return this.http.post(`${this.baseUrl}/chat`, body);
  }

  /** POST /chat/action */
  trackAction(body: WebsiteChatActionBody): Observable<any> {
    return this.http.post(`${this.baseUrl}/chat/action`, body);
  }

  /** GET /suggestions */
  getSuggestions(): Observable<any> {
    return this.http.get(`${this.baseUrl}/suggestions`);
  }

  /** GET /modules */
  getModules(): Observable<any> {
    return this.http.get(`${this.baseUrl}/modules`);
  }

  // ─── Booking ────────────────────────────────────────────────────────────

  /** POST /booking/start */
  startBooking(body: BookingStartBody): Observable<any> {
    return this.http.post(`${this.baseUrl}/booking/start`, body);
  }

  /** POST /booking/step */
  bookingStep(body: BookingStepBody): Observable<any> {
    return this.http.post(`${this.baseUrl}/booking/step`, body);
  }

  /** GET /booking/:session_id */
  getBooking(sessionId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/booking/${sessionId}`);
  }

  // ─── Admin ──────────────────────────────────────────────────────────────

  /** POST /admin/rebuild-index */
  rebuildIndex(): Observable<any> {
    return this.http.post(`${this.baseUrl}/admin/rebuild-index`, {});
  }

  /** PATCH /admin/bookings/:booking_id/status */
  updateBookingStatus(bookingId: string | number, body: UpdateBookingStatusBody): Observable<any> {
    return this.http.patch(`${this.baseUrl}/admin/bookings/${bookingId}/status`, body);
  }

  /** GET /admin/reports/summary */
  getSummaryReport(range?: ReportDateRange): Observable<any> {
    return this.http.get(`${this.baseUrl}/admin/reports/summary`, { params: this.toParams(range) });
  }

  /** GET /admin/reports/top-intents */
  getTopIntentsReport(limit = 10, range?: ReportDateRange): Observable<any> {
    return this.http.get(`${this.baseUrl}/admin/reports/top-intents`, {
      params: this.toParams({ ...range, limit }),
    });
  }

  /** GET /admin/reports/unanswered */
  getUnansweredReport(limit = 50): Observable<any> {
    return this.http.get(`${this.baseUrl}/admin/reports/unanswered`, {
      params: this.toParams({ limit }),
    });
  }

  /** GET /admin/reports/match-quality */
  getMatchQualityReport(): Observable<any> {
    return this.http.get(`${this.baseUrl}/admin/reports/match-quality`);
  }

  /** GET /admin/reports/actions */
  getActionsReport(): Observable<any> {
    return this.http.get(`${this.baseUrl}/admin/reports/actions`);
  }

  /** GET /admin/reports/bookings */
  getBookingsReport(
    limit = 50,
    status?: string,
    range?: ReportDateRange
  ): Observable<any> {
    return this.http.get(`${this.baseUrl}/admin/reports/bookings`, {
      params: this.toParams({ ...range, limit, status }),
    });
  }

  private toParams<T extends object>(obj?: T): Record<string, string> {
    const params: Record<string, string> = {};
    if (!obj) return params;
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined && value !== null && value !== '') {
        params[key] = String(value);
      }
    }
    return params;
  }
}
