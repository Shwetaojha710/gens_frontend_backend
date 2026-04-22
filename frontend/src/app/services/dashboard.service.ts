import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/internal/Observable';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
baseUrl=environment.apiUrl
    constructor(private http: HttpClient) { }


    getDashboardData(range: string = 'This Week', section: 'employee' | 'leave' = 'employee'): Observable<any> {
    return this.http.post(`${this.baseUrl}dashboard`, { range, section });
  }

  getAttendanceChart(range: string = 'This Week'): Observable<any> {
    return this.http.post(`${this.baseUrl}dashboard-attendance-chart`, { range });
  }

  getAttendanceByDepartment(range: string = 'This Week'): Observable<any> {
    return this.http.post(`${this.baseUrl}dashboard-attendance-by-department`, { range });
  }
  //    getDashboardData(): Observable<any> {
  //   return this.http.post(`http://192.168.23.17:3002/api/dashboard`, {});
  // }
}
