import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AttendanceService {
  private baseUrl = environment.apiUrl || 'http://192.168.23.11:3001/api/';

  constructor(private http: HttpClient) { }
  getattendancelist(obj: any): Observable<any> {
    return this.http.post(`${this.baseUrl}get-emp-attendance`, obj);
  }
  getHolidayList(obj:any): Observable<any> {
    return this.http.post(`${this.baseUrl}get-holidayList`, obj);
  }
  addHoliday(obj: any): Observable<any> {
    return this.http.post(`${this.baseUrl}add-holiday`, obj);
  }
  updateHoliday(obj: any): Observable<any> {
    return this.http.post(`${this.baseUrl}update-holiday`, obj);
  }
  deleteHoliday(obj: any): Observable<any> {
    return this.http.post(`${this.baseUrl}delete-holiday`, obj);
  }
  deleteAttendance(obj: any): Observable<any> {
    return this.http.post(`${this.baseUrl}delete-attendance`, obj);
  }
    getdateWiseAttendance(obj: any): Observable<any> {
    return this.http.post(`${this.baseUrl}get-date-wise-attendance`, obj);
  }
  updateAttendance(obj: any): Observable<any> {
    return this.http.post(`${this.baseUrl}update-attendance`, obj);
  }
  BulkUpdateAttendance(obj: any): Observable<any> {
    return this.http.post(`${this.baseUrl}bulk-update-attendance`, obj);
  }
  updateEmpAttendance(obj: any): Observable<any> {
    return this.http.post(`${this.baseUrl}update-emp-attendance`, obj);
  }
   uploadFile(data:any): Observable<any> {
    //     const formData = new FormData();
    // formData.append('file', file);
    return this.http.post(`${this.baseUrl}upload-attendance`, data);
  }

    downloadAttendance(obj:any): Observable<Blob> {
    return this.http.post(`${this.baseUrl}download`, obj, { responseType: 'blob' });
  }
    getLateAttendance(obj:any): Observable<any> {
    return this.http.post(`${this.baseUrl}get-late-attendance`, obj);
  }
    getweekendAttendance(obj:any): Observable<any> {
    return this.http.post(`${this.baseUrl}get-weekend-attendance`, obj);
  }
    AddCompOff(obj: any): Observable<any> {
    return this.http.post(`${this.baseUrl}generate-comp-off-leave`, obj);
  }
    AddManuallyCompOff(obj: any): Observable<any> {
    return this.http.post(`${this.baseUrl}create-manually-comp-off`, obj);
  }
    listManuallyCompOff(obj: any): Observable<any> {
    return this.http.post(`${this.baseUrl}list-manually-comp-off`, obj);
  }
    approveManuallyCompOff(obj: any): Observable<any> {
    return this.http.post(`${this.baseUrl}approve-comp-off-leave`, obj);
  }
}
