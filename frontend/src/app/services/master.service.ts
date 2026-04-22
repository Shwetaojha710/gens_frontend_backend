import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
@Injectable({
  providedIn: 'root'
})
export class MasterService {

  private baseUrl = environment.apiUrl || 'http://192.168.23.11:3001/api/';

  constructor(private http: HttpClient) { }

  // getDepartments(): Observable<any> {
  //   return this.http.get(`${this.baseUrl}/departments`);
  // }
  getBaseUrl(): string {
    const PORT = localStorage.getItem('PORT')?.replace(/["\\,]/g, '') || '3002';
    return window.location.hostname == 'localhost'
      ? localStorage.getItem('base_url')?.replace(/["\\,]/g, '') || ''
      : localStorage.getItem('base_url')?.replace(/["\\,]/g, '') || '';
  }

  getImageUrl(filename: string): string {
    const base = this.getBaseUrl()
    return `${base}upload/${filename}`;
  }

  getDesignations(): Observable<any> {
    return this.http.post(`${this.baseUrl}getDesignations`, {});
  }
  AppEmpList(): Observable<any> {
    return this.http.post(`${this.baseUrl}app-emp-list`, {});
  }
  getEmploymentTypes(obj:any): Observable<any> {
    return this.http.post(`${this.baseUrl}getEmpTypeDD`, obj);
  }
  addDepartment(dept: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}createDepartment`, dept);
  }

  updateDepartment(id: any, dept: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}updateDepartment`, dept);
  }
  getDepartments(): Observable<any> {
    return this.http.post(`${this.baseUrl}getDepartments`, {});
  }


  Departmentsdd(obj:any): Observable<any> {
    return this.http.post(`${this.baseUrl}department-dd`, obj);
  }
  designationDD(obj: any): Observable<any> {
    return this.http.post(`${this.baseUrl}designation-dd`, obj);
  }

  deleteDepartment(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}deleteDepartment`, data);
  }
  deletedesignation(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}deleteDesignation`, data);
  }
  adddesignation(dept: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}createDesignation`, dept);
  }
  updatedesignation(id: any, dept: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}updateDesignation`, dept);
  }



  getEmployee(): Observable<any> {
    return this.http.post(`${this.baseUrl}getEmpTypes`, {});
  }

  addEmployee(dept: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}createEmpType`, dept);
  }

  updateEmployee(id: any, dept: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}editEmpType`, dept);
  }

  deleteEmployee(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}deleteEmpType`, data);
  }
  getshifts(): Observable<any> {
    return this.http.post(`${this.baseUrl}getShift`, {});
  }

  createShift(dept: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}createShift`, dept);
  }

  updateShift(id: any, dept: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}updateShift`, dept);
  }

  deleteShift(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}deleteShift`, data);
  }



  getDocument(obj: any): Observable<any> {
    return this.http.post(`${this.baseUrl}getDocument`, obj);
  }
  getDocumentType(): Observable<any> {
    return this.http.post(`${this.baseUrl}getDocumentType`, {});
  }

  addDocumenttype(dept: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}createDocumentType`, dept);
  }

  addDocument(dept: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}createDocument`, dept);
  }

  updateDocument(dept: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}editDocument`, dept);
  }
  updateDocumentType(id: any, dept: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}updateDocumentType`, dept);
  }

  deleteDocument(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}deleteDocument`, data);
  }
  deleteDocumentType(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}deleteDocumentType`, data);
  }

  getDocumentDD(): Observable<any> {
    return this.http.post(`${this.baseUrl}getDocumentDD`, {});
  }

  addSalaryMaster(dept: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}attendance-setting`, dept);
  }

  updateSalaryMaster(id: any, dept: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}update-attendance-setting`, dept);
  }

  deleteSalaryMaster(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}deleteSalaryMaster`, data);
  }
  getAttendanceSetting(): Observable<any> {
    return this.http.post(`${this.baseUrl}get-attendance-setting`, {});
  }



  createLeave(dept: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}create-leave`, dept);
  }
  getLeaveList(): Observable<any> {
    return this.http.post(`${this.baseUrl}get-leaves`, {});
  }

  updateLeave(id: any, dept: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}update-leaves`, dept);
  }

  deleteLeave(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}delete-leaves`, data);
  }

  getemployeeList(): Observable<any> {
    return this.http.post(`${this.baseUrl}get-emp-list`, {});
  }
  getAttendanceYear(): Observable<any> {
    return this.http.post(`${this.baseUrl}get-attendance-year`, {});
  }
  getLeaveTypeList(): Observable<any> {
    return this.http.post(`${this.baseUrl}get-leave-type-dd`, {});
  }
  ApplyLeave(dept: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}apply-leave`, dept);
  }
  UpdateApplyLeaveStatus(dept: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}update-apply-leave-status`, dept);
  }
  getapplyLeaveList(obj:any): Observable<any> {
    return this.http.post(`${this.baseUrl}get-applied-leaves`, obj);
  }


  getHolidayType(): Observable<any> {
    return this.http.post(`${this.baseUrl}getHolidayTypes`, {});
  }

  addHolidayType(dept: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}createHolidayType`, dept);
  }

  updateHolidayType(id: any, dept: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}editHolidayType`, dept);
  }

  deleteHolidayType(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}deleteHolidayType`, data);
  }
  getHolidayTypeDD(): Observable<any> {
    return this.http.post(`${this.baseUrl}getHolidayTypeDD`, {});
  }

  addPrefix(dept: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}add-prefix`, dept);
  }

  updatePrefix(id: any, dept: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}update-prefix`, dept);
  }

  deletePrefix(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}delete-prefix`, data);
  }
  getPrefix(): Observable<any> {
    return this.http.post(`${this.baseUrl}get-prefix`, {});
  }

  addComponent(dept: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}create-component`, dept);
  }

  updateComponent(id: any, dept: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}updateComponent`, dept);
  }
  getComponent(): Observable<any> {
    return this.http.post(`${this.baseUrl}get-component`, {});
  }
  fetchComponentsMaster(): Observable<any> {
    return this.http.post(`${this.baseUrl}get-component`, {});
  }
  deleteSalaryComponent(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}delete-component`, data);
  }
  updateSalaryComponent(id: any, dept: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}update-component`, dept);
  }
  addCurrency(dept: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}add-Currency`, dept);
  }

  updateCurrency(id: any, dept: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}update-Currency`, dept);
  }

  deleteCurrency(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}delete-Currency`, data);
  }
  getCurrency(): Observable<any> {
    return this.http.post(`${this.baseUrl}get-Currency`, {});
  }

  getSalaryOrder(): Observable<any> {
    return this.http.post(`${this.baseUrl}getSalaryOrder`, {});
  }

  addSalaryOrder(dept: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}createSalaryOrder`, dept);
  }

  updateSalaryOrder(id: any, dept: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}editSalaryOrder`, dept);
  }

  deleteSalaryOrder(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}deleteSalaryOrder`, data);
  }

  getRegularizeList(obj: any): Observable<any> {
    return this.http.post(`${this.baseUrl}pending-regularize-list`, obj);
  }
  UpdateApplyRegularizeStatus(obj: any): Observable<any> {
    return this.http.post(`${this.baseUrl}update-status`, obj);
  }


  addBranch(dept: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}createBranch`, dept);
  }

  addBranchWithImage(formData: FormData): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}createBranch`, formData);
  }

  updateBranchWithImage(formData: FormData): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}updateBranch`, formData);
  }

  updateBranch(id: any, dept: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}updateBranch`, dept);
  }
  getBranchs(): Observable<any> {
    return this.http.post(`${this.baseUrl}getBranch`, {});
  }


  BranchDD(): Observable<any> {
    return this.http.post(`${this.baseUrl}branch-dd`, {});
  }

  deleteBranch(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}deleteBranch`, data);
  }
  //    getAttendanceSetting(): Observable<any> {
  //     return this.http.post(`${this.baseUrl}get-attendance-setting`, {});
  //   }
}
