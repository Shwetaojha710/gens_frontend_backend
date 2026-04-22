import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Notyf } from 'notyf';
// import 'notyf/notyf.min.css';

@Injectable({
  providedIn: 'root'
})
export class StatusService {
  notyf: Notyf;

  constructor(private router: Router,) {
    this.notyf = new Notyf();
  }
  handleResponseStatus(status: any, successMessage?: string) {
    switch (status) {
      case true:
        if (successMessage) {
          // this.notyf.success(successMessage);
        }
        return status;

      case 'expired':
        this.notyf.error(successMessage || 'Session expired');
        localStorage.clear();
        this.router.navigate(['login']);
        return status;

      case false:
        this.notyf.error(successMessage || 'Something went wrong');
        return status;

      default:
        this.notyf.error(successMessage || 'Unknown response status');
        return status;
    }
  }

}
