import { Component } from '@angular/core';
import { SearchPaginationComponent } from '../master/search-pagination/search-pagination.component';
import { CommonModule } from '@angular/common';
import { FormsModule, FormGroup, FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { Router } from '@angular/router';
import { Notyf } from 'notyf';
import Swal from 'sweetalert2';
import { MasterService } from '../services/master.service';
import { StatusService } from '../services/status.service';
import { ValidationUtil } from '../shared/utils/validation.util';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-emp-profile',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './emp-profile.component.html',
  styleUrl: './emp-profile.component.css'
})
// export class EmpProfileComponent {

// }

export class EmpProfileComponent {
  form: FormGroup;
  notyf: Notyf;

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router
  ) {
    this.form = this.fb.group({
      tenantId: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });

    this.notyf = new Notyf();
  }

  login() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.notyf.error('Please fill in all required fields.');
      return;
    }

    this.auth.updatePassword(this.form.value).subscribe({
      next: (res) => {

        const data = JSON.parse(res)
        if (data.status === true) {
          // localStorage.setItem('token', data.data.token);
          //  localStorage.setItem("base_url", data.data.baseUrl);
          //  localStorage.setItem("PORT", data.data.PORT);
          //  localStorage.setItem('user', JSON.stringify(data.data.user));
          //  localStorage.setItem('currency', JSON.stringify(data.data.currencyList));
          this.notyf.success(data.message);
          this.router.navigate(['login']);
        } else {
          this.notyf.error(data.message);
        }
      },
      error: (err) => {
        console.error('Login error:', err);
        this.notyf.error(err.error?.message || 'Server error. Please try again.');
      }
    });
  }

passwordVisible: boolean = false;

 isInvalid(controlName: string): boolean {
  const control = this.form.get(controlName);
  return control ? control.invalid && (control.dirty || control.touched) : false;
}
}
