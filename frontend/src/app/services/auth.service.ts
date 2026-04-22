import { HttpClient } from '@angular/common/http';

import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
@Injectable({
  providedIn: 'root',
})
export class AuthService {
  constructor(private http: HttpClient) {}

  baseurl =environment.apiUrl;
  loginUser(object: any): Observable<any> {
    return this.http.post(`${this.baseurl}login`, object, {
      withCredentials: true,
      responseType: 'text',
    });
  }

  sendOtp(object: any): Observable<any> {
    return this.http.post(`${this.baseurl}send-otp`, object, {
      withCredentials: true,
      responseType: 'text',
    });
  }

  verifyOtp(object: any): Observable<any> {
    return this.http.post(`${this.baseurl}verify-otp-login`, object, {
      withCredentials: true,
      responseType: 'text',
    });
  }

  CompanyRegister(object: any): Observable<any> {
    return this.http.post(`${this.baseurl}company-register`, object, {
      withCredentials: true,
      responseType: 'text',
    });
  }
  updatePassword(object: any): Observable<any> {
    return this.http.post(`${this.baseurl}update-password`, object, {
      withCredentials: true,
      responseType: 'text',
    });
  }
  //   logout(object: any): Observable<any> {
  //   return this.http.post(`${this.baseurl}logout`, object, {
  //     withCredentials: true,
  //     responseType: 'text',
  //   }
  // );
  // }
    logout(): Observable<any> {
    return this.http.post(`${this.baseurl}logout`, {});
  }

}
