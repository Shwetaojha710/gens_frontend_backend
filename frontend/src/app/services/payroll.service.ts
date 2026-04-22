import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/internal/Observable';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class PayrollService {

baseUrl=environment.apiUrl

  constructor(private http: HttpClient) {}
   createBasic(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}createBasic`, data);
  }
    getBasics(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}getBasic`, data);
  }
     deleteBasic(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}deleteBasic`, data);
  }
    updateBasic(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}updateBasic`, data);
  }
    updateSalarySetUp(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}updateSalarySetUp`, data);
  }
    getComponentDd(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}getComponentDD`, data);
  }
    createVariable(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}createVariable`, data);
  }



  createAllowance(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}createAllowance`, data);
  }

  getAllowance(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}getAllowance`, data);
  }

  deleteAllowance(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}deleteAllowance`, data);
  }

  updateAllowance(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}updateAllowance`, data);
  }

   createDeduction(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}create-deduction-master`, data);
  }

  getDeduction(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}get-deduction-master`, data);
  }

  deleteDeduction(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}delete-deduction-master`, data);
  }

  updateDeduction(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}update-deduction-master`, data);
  }
  calculateAttendance(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}calculate-attendance`, data);
  }
  // calculateAttendance(data: any): Observable<any> {
  //   return this.http.post(`http://192.168.23.17:3002/api/calculate-attendance`, data);
  // }
  calculateSalaryComponent(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}calculate-salary-component`, data);
  }
  generateSalary(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}generate-Salary`, data);
  }
  getGeneratedSalaryList(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}generate-Salary-list`, data);
  }
  revertSalary(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}revert-Salary`, data);
  }
  AddSalarycomp(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}update-salary`, data);
  }
    SetUpsalary(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}setup-salary`, data);
  }
    getSalarySetupList(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}get-active-salary-component`, data);
  }
    getBillDetails(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}getBillDetails`, data);
  }
   addReimbursement(obj: any): Observable<any> {
    return this.http.post(`${this.baseUrl}add-reimbursement`, obj);
  }
   fetchReimbursementList(): Observable<any> {
    return this.http.post(`${this.baseUrl}fetchReimbursement`, {});
  }
    updateReimbursement(obj: any): Observable<any> {
    return this.http.post(`${this.baseUrl}update-reimbursement`, obj);
  }
    updateReimbursementStatus(obj: any): Observable<any> {
    return this.http.post(`${this.baseUrl}update-reimbursement-status`, obj);
  }
    deleteReimbursement(obj: any): Observable<any> {
    return this.http.post(`${this.baseUrl}delete-reimbursement`, obj);
  }

     empMonthlyLeaveAttDetails(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}employee-monthly-leave-attendance-details`, data);
  }
  SubmitSalaryDoc(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}SubmitSalaryDoc`, data);
  }
}
