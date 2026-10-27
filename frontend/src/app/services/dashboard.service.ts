import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
baseUrl=environment.apiUrl
    constructor(private http: HttpClient) { }


    getDashboardData(range: string = 'This Week', section: 'employee' | 'leave' = 'employee', date?: string, chartRange?: string): Observable<any> {
    return this.http.post(`${this.baseUrl}dashboard`, { range, section, date, chartRange });
  }

  getAttendanceChart(range: string = 'This Week', date?: string): Observable<any> {
    return this.http.post(`${this.baseUrl}dashboard-attendance-chart`, { range, date });
  }

  getAttendanceByDepartment(range: string = 'This Week', date?: string): Observable<any> {
    return this.http.post(`${this.baseUrl}dashboard-attendance-by-department`, { range, date });
  }

  getTeamwiseAttendance(date?: string, branchId?: string): Observable<any> {
    const body: any = {};
    if (date) body['date'] = date;
    if (branchId) body['branchId'] = branchId;
    return this.http.post(`${this.baseUrl}team-wise-attendance`, body);
  }
  //    getDashboardData(): Observable<any> {
  //   return this.http.post(`http://192.168.23.17:3002/api/dashboard`, {});
  // }
}
