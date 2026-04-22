import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Notyf } from 'notyf';
import { AuthService } from '../services/auth.service';
import { PublicLandingService } from '../services/public-landing.service';
import Swal from 'sweetalert2';

/** Razorpay Checkout (loaded from CDN). */
declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

export interface RegPlanSummary {
  id: string;
  name: string;
  code: string | null;
  price: number | null;
  requiresPayment: boolean;
  razorpayReady: boolean;
}

@Component({
  selector: 'app-company-reg',
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './company-reg.component.html',
  styleUrl: './company-reg.component.css',
})
export class CompanyRegComponent implements OnInit {
  form: FormGroup;
  notyf: Notyf;
  passwordVisible: boolean = false;
  /** From /company-reg?planId=… (optional) */
  planId: string | null = null;
  planSummary: RegPlanSummary | null = null;
  planLoading = false;
  paymentOpening = false;

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private publicLanding: PublicLandingService,
    private router: Router,
    private route: ActivatedRoute,
  ) {
    this.form = this.fb.group({
      tenantId: ['', [Validators.required, Validators.pattern(/^[a-zA-Z0-9\-_]+$/)]],
      tenantName: ['', [Validators.required, Validators.maxLength(60), Validators.pattern(/^[a-zA-Z0-9\s.\-&']+$/)]],
      email: ['', [Validators.required, Validators.email, Validators.pattern(/^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/)]],
      password: ['', [
        Validators.required,
        Validators.minLength(8),
        Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&_\-#])[A-Za-z\d@$!%*?&_\-#]{8,}$/)
      ]],
    });

    this.notyf = new Notyf();
  }

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((pm) => {
      const id = pm.get('planId');
      this.planId = id && id.trim() ? id.trim() : null;
      this.planSummary = null;
      if (this.planId) {
        this.loadPlanSummary(this.planId);
      }
    });
  }

  private loadPlanSummary(id: string): void {
    this.planLoading = true;
    this.publicLanding.getPublicPlan(id).subscribe({
      next: (raw:any) => {
        try {
          const data = JSON.parse(raw) as {
            status?: boolean;
            message?: string;
            data?: RegPlanSummary;
          };
          if (data?.status && data.data) {
            this.planSummary = data.data;
          } else {
            this.notyf.error(data?.message || 'Could not load plan.');
          }
        } catch {
          this.notyf.error('Invalid plan response.');
        }
        this.planLoading = false;
      },
      error: () => {
        this.notyf.error('Could not load plan.');
        this.planLoading = false;
      },
    });
  }

  private loadRazorpayScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof window !== 'undefined' && window.Razorpay) {
        resolve();
        return;
      }
      const existing = document.querySelector('script[data-gens-razorpay="1"]');
      if (existing) {
        existing.addEventListener('load', () => resolve());
        existing.addEventListener('error', () => reject(new Error('Razorpay script failed')));
        return;
      }
      const s = document.createElement('script');
      s.src = 'https://checkout.razorpay.com/v1/checkout.js';
      s.async = true;
      s.setAttribute('data-gens-razorpay', '1');
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('Razorpay script failed'));
      document.body.appendChild(s);
    });
  }

  private submitRegistration(extra: Record<string, string> = {}): void {
    const uploadData = new FormData();
    uploadData.append('tenantId', this.form.value.tenantId);
    uploadData.append('tenantName', this.form.value.tenantName);
    uploadData.append('email', this.form.value.email);
    uploadData.append('password', this.form.value.password);
    uploadData.append('image', this.selectedFile as Blob);
    if (this.planId) {
      uploadData.append('planId', this.planId);
    }
    Object.entries(extra).forEach(([k, v]) => {
      if (v) uploadData.append(k, v);
    });

    this.auth.CompanyRegister(uploadData).subscribe({
      next: (res: unknown) => {
        const data = JSON.parse(res as string);
        if (data.status == true) {
          this.notyf.success(data.message);
          void this.router.navigate(['login']);
        } else {
          this.notyf.error(data.message || 'Registration failed.');
        }
      },
      error: (err) => {
        console.error('REGISTRATION error:', err?.error);
        try {
          const error = JSON.parse(err?.error);
          this.notyf.error(error?.message || 'Server error. Please try again.');
        } catch {
          this.notyf.error('Server error. Please try again.');
        }
      },
    });
  }

  private openRazorpayCheckout(): void {
    const v = this.form.getRawValue();
    if (!this.planId || !this.planSummary?.requiresPayment) {
      this.submitRegistration();
      return;
    }
    if (!this.planSummary.razorpayReady) {
      this.notyf.error(
        'Online payment is not set up for this plan. Pick another plan or contact your administrator.',
      );
      return;
    }
    this.paymentOpening = true;
    this.publicLanding
      .startRazorpaySubscription({
        planId: this.planId,
        email: String(v.email).trim(),
        name: String(v.tenantName).trim(),
      })
      .subscribe({
        next: async (raw:any) => {
          this.paymentOpening = false;
          try {
            const data = JSON.parse(raw) as {
              status?: boolean;
              message?: string;
              data?: { keyId: string; subscriptionId: string; planName?: string };
            };
            if (!data?.status || !data.data?.subscriptionId || !data.data?.keyId) {
              this.notyf.error(data?.message || 'Could not start payment.');
              return;
            }
            const d = data.data;
            try {
              await this.loadRazorpayScript();
            } catch {
              this.notyf.error('Could not load payment widget.');
              return;
            }
            if (!window.Razorpay) {
              this.notyf.error('Payment widget unavailable.');
              return;
            }
            const options: Record<string, unknown> = {
              key: d.keyId,
              subscription_id: d.subscriptionId,
              name: 'GENS',
              description: d.planName || 'Subscription',
              handler: (response: {
                razorpay_payment_id?: string;
                razorpay_subscription_id?: string;
                razorpay_signature?: string;
              }) => {
                const pid = response.razorpay_payment_id;
                const sid = response.razorpay_subscription_id;
                const sig = response.razorpay_signature;
                if (!pid || !sid || !sig) {
                  this.notyf.error('Payment did not complete.');
                  return;
                }
                this.submitRegistration({
                  razorpay_payment_id: pid,
                  razorpay_subscription_id: sid,
                  razorpay_signature: sig,
                });
              },
              modal: {
                ondismiss: () => {},
              },
              theme: { color: '#209af7' },
            };
            const rzp = new window.Razorpay(options);
            rzp.open();
          } catch {
            this.notyf.error('Invalid payment response.');
          }
        },
        error: () => {
          this.paymentOpening = false;
          this.notyf.error('Could not reach payment service.');
        },
      });
  }

  personalDetails: any = {};

  preventMoreThanTenDigits(event: KeyboardEvent, value: string): void {
    const isDigit = /^[0-9]$/.test(event.key);
    if (!isDigit || (value && value.length >= 10)) {
      event.preventDefault();
    }
  }
  register() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.notyf.error('Please fill in all required fields.');
      return;
    }

    if (!this.selectedFile) {
      Swal.fire({
        toast: true,
        position: "top",
        showConfirmButton: false,
        icon: "warning",
        timer: 3000,
        title: "Please select a company logo",
      });
      return;
    }

    if (this.planId) {
      if (this.planLoading) {
        this.notyf.error('Plan details are still loading. Please wait.');
        return;
      }
      if (!this.planSummary) {
        this.notyf.error('Plan could not be loaded. Go back to pricing and try again.');
        return;
      }
    }

    const needsPay = this.planSummary?.requiresPayment === true;
    if (needsPay) {
      this.openRazorpayCheckout();
      return;
    }

    this.submitRegistration();
  }


  gotoLogin() {
    this.router.navigate(['login']);
  }
  isInvalid(controlName: string): boolean {
    const control = this.form.get(controlName);
    return control ? control.invalid && (control.dirty || control.touched) : false;
  }
  isFileInvalid: boolean = false;
  selectedFile: File | null = null;
  previewUrl: string | null = null;
  onFileChange(event: any): void {
    const file: File = event.target.files[0];

    if (!file) {
      this.selectedFile = null;
      return;
    }

    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    const maxSize = 2 * 1024 * 1024; // 2MB

    if (!allowedTypes.includes(file.type)) {
      Swal.fire({
        icon: 'error',
        title: 'Invalid File Type',
        text: 'Only JPG, JPEG, and PNG formats are allowed.',
      });
      event.target.value = ''; // Clear the file input
      this.selectedFile = null;
      return;
    }

    if (file.size > maxSize) {
      // Swal.fire({
      //   icon: 'error',
      //   title: 'File Too Large',
      //   text: 'Maximum allowed file size is 2MB.',
      // });
      this.notyf.error('Maximum allowed file size is 2MB.');
      event.target.value = ''; // Clear the file input
      this.selectedFile = null;
      return;
    }

    this.selectedFile = file;

    const reader = new FileReader();
    reader.onload = () => {
      this.previewUrl = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  @ViewChild('fileInput') fileInput!: ElementRef;
  // addPhoto() {
  //   console.log("apii callled")
  //   const uploadData = new FormData();
  //   uploadData.append('id', this.personalDetails.id)
  //   uploadData.append('employeeId', this.personalDetails.id)
  //   uploadData.append('name', this.personalDetails.firstName)

  //   if (this.selectedFile) {
  //     uploadData.append('profileImage', this.selectedFile, this.selectedFile.name);
  //     // uploadData.append('image', this.selectedFile, this.selectedFile.name);
  //     // uploadData.append('file', this.selectedFile, this.selectedFile.name);
  //   } else {
  //     Swal.fire({
  //       toast: true,
  //       position: "top",
  //       showConfirmButton: false,
  //       icon: "warning",
  //       timer: 5000,
  //       title: "Select a file to upload",
  //     });
  //     return;
  //   }

  //   this.employeeService.uploadImage(uploadData).subscribe({
  //     next: (response: any) => {
  //       console.log('response', response);

  //       let message = response.message ? response.message : 'Data found Successfully';
  //       let status = this.statusService.handleResponseStatus(response.status, message);
  //       console.log(status)
  //       console.log("response", response);

  //       if (status === true) {
  //         this.notyf.success(message)
  //         this.selectedFile = null;
  //         this.fileInput.nativeElement.value = '';
  //         this.fetchDocument();
  //         // this.resetForm();
  //       }
  //       else if (status === "expired") {
  //         this.router.navigate(["login"]);
  //       }

  //       else {
  //         this.notyf.error(message)
  //       }

  //     },
  //     error: (err) => {
  //       console.error('Error:', err);
  //       this.notyf.error(err)
  //     }
  //   });

  //   // this.employeeService.pythonregister(uploadData).subscribe({
  //   //   next: (response: any) => {
  //   //     console.log('response', response);

  //   //     let message = response.message ? response.message : 'Data found Successfully';
  //   //     let status = this.statusService.handleResponseStatus(response.status, message);
  //   //     console.log(status)
  //   //     console.log("response", response);

  //   //     if (status === true) {

  //   //       this.notyf.success(message)
  //   //       this.fetchDocument();
  //   //       // this.resetForm();
  //   //     }
  //   //     else if (status === "expired") {
  //   //         this.router.navigate(["login"]);
  //   //     }

  //   //     else {
  //   //       this.notyf.error(message)
  //   //     }

  //   //   },
  //   //   error: (err) => {
  //   //     console.error('Error:', err);
  //   //     this.notyf.error(err)
  //   //   }
  //   // });

  // }
}
