import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PermissionSection } from '../../services/permission.service';

export interface TenantUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

@Injectable({ providedIn: 'root' })
export class UserPermissionService {
  private get base(): string {
    return environment.apiUrl;
  }

  private get headers(): HttpHeaders {
    const token = localStorage.getItem('token') || '';
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  constructor(private http: HttpClient) {}

  /** Get all active users for the logged-in tenant */
  getTenantUsers(): Observable<any> {
    return this.http.post(`${this.base}get-tenant-users`, {}, { headers: this.headers });
  }

  /** Get custom permissions for a specific user */
  getUserPermission(userId: string): Observable<any> {
    return this.http.post(`${this.base}get-user-permission`, { userId }, { headers: this.headers });
  }

  /** Save custom permissions for a specific user */
  saveUserPermission(userId: string, permissions: PermissionSection[]): Observable<any> {
    return this.http.post(`${this.base}save-user-permission`, { userId, permissions }, { headers: this.headers });
  }

  /** Delete custom permissions — user reverts to role-based defaults */
  deleteUserPermission(userId: string): Observable<any> {
    return this.http.post(`${this.base}delete-user-permission`, { userId }, { headers: this.headers });
  }
}
