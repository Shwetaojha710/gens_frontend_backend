import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ReportsService {
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  getEmployeeReport(status: string = 'active'): Observable<any> {
    return this.http.post(`${this.baseUrl}employee-report`, { status });
  }

  getPayrollReport(month: number, year: number): Observable<any> {
    return this.http.post(`${this.baseUrl}payroll-report`, { month, year });
  }

  getSalaryRegisterReport(month: number, year: number): Observable<any> {
    return this.http.post(`${this.baseUrl}salary-register-report`, { month, year });
  }
}
