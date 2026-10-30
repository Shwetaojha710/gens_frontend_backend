import { Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
// import { EmployeeService } from '../../services/employee.service';
import { FormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { CommonModule } from '@angular/common';

import { Router, RouterModule } from '@angular/router';
import { QualificationComponent } from '../profile/professional-info/qualification/qualification.component';
import { ExperienceComponent } from "../profile/professional-info/experience/experience.component";
import { BankDetailsComponent } from "../profile/professional-info/bank-details/bank-details.component";
import Swal from 'sweetalert2';
import { MasterService } from '../../services/master.service';
import { Notyf } from 'notyf';
import * as bootstrap from 'bootstrap';
import { BasicComponent } from '../../payroll/basic/basic.component';
import { AllowancesComponent } from '../../payroll/allowances/allowances.component';
import { TotalSalaryComponentComponent } from '../../payroll/total-salary-component/total-salary-component.component';
import { DeductionsComponent } from '../../payroll/deductions/deductions.component';
// import { AssignLeaveComponent } from "../profile/professional-info/assign-leave/assign-leave.component";
import { EmployeeService } from '../../services/employee.service';
import { DataService } from '../../services/data.service';
import { StatusService } from '../../services/status.service';
import { AssignLeaveComponent } from '../profile/professional-info/assign-leave/assign-leave.component';
import { NdaComponent } from '../profile/nda/nda.component';
import { OfferLetterComponent } from '../profile/offer-letter/offer-letter.component';
import { ServiceAgreementComponent } from '../profile/service-agreement/service-agreement.component';
import { AppointmentLetterComponent } from '../profile/appointment-letter/appointment-letter.component';
import { RelevingLetterComponent } from '../profile/releving-letter/releving-letter.component';
import { InsuranceDocumentsComponent } from '../profile/insurance-documents/insurance-documents.component';
// import { DocumentRendererComponent } from '../profile/document-renderer/document-renderer.component';

@Component({
  selector: 'app-add',
  standalone: true,
  imports: [CommonModule, FormsModule, AssignLeaveComponent, NgSelectModule, RouterModule, NdaComponent, QualificationComponent, ExperienceComponent,
    BankDetailsComponent, RelevingLetterComponent, BasicComponent, AllowancesComponent, TotalSalaryComponentComponent, DeductionsComponent, OfferLetterComponent, ServiceAgreementComponent, AppointmentLetterComponent, InsuranceDocumentsComponent],
  templateUrl: './add.component.html',
  styleUrls: ['./add.component.css']
})
export class AddComponent implements OnDestroy {
  @ViewChild('adminCameraVideo') adminCameraVideo?: ElementRef<HTMLVideoElement>;
  notyf: Notyf;
  personalDetails: any = {}
  cameraOpen = false;
  cameraBusy = false;
  cameraError: string | null = null;
  private cameraStream: MediaStream | null = null;
  constructor(private Documentervice: MasterService,
    private router: Router,
    private employeeService: EmployeeService, public dataService: DataService, public statusService: StatusService) {

    this.personalDetails = JSON.parse(localStorage.getItem('employeeId') || '{}');

    this.notyf = new Notyf();
    console.log(this.personalDetails, "personaldetails");
         this.DepartmentDD()
this.getDesignation(this.personalDetails.departmentId)

     this.getEmploymentTypes();

     this.loadEmployees()
     this.getStateDistrict(this.personalDetails.pinCode)
  }
    role: any = [{ value: 'manager', label: 'Manager' }, { value: 'teamLeader', label: 'Team Leader' }, { value: 'employee', label: 'employee' }]

  maritalStatusList = [
    { value: 'Single', label: 'Single' },
    { value: 'Married', label: 'Married' },
    { value: 'Divorced', label: 'Divorced' },
    { value: 'Widowed', label: 'Widowed' },
    { value: 'Separated', label: 'Separated'}
  ];
  genderList = [
    { value: 'Male', label: 'Male' },
    { value: 'Female', label: 'Female' },
    { value: 'Other', label: 'Other' }
  ]
  shift: any = [{ value: 'Day', label: 'Day' }, { value: 'Afternoon', label: 'Afternoon' }, { value: 'Night', label: 'Night' }]

  baseurl: any;
  async ngOnInit() {
    // this.baseurl = localStorage.getItem('base_url')?.replace(/["\\,]/g, '') || '';
    this.baseurl = this.Documentervice.getBaseUrl();
    await this.fetchDocument()
    await this.countrydd()
    await this.getstates(this.personalDetails.country)
    await this.getcity(this.personalDetails.state)
    await this.navigateToLeave()


  }
   getEmploymentTypes() {
    let obj:any={}
    this.employmentTypes = [];
    obj["branchId"]=this.personalDetails['branchId']
    this.Documentervice.getEmploymentTypes(obj).subscribe(data => {
      this.employmentTypes = data.data || [];
    });
  }
  getStateDistrict(pin_code: any) {
  if (!pin_code) return;

  let obj: any = {
    pin_code: pin_code
  };

  this.employeeService.getStatesDistrict(obj).subscribe({
    next: (data: any) => {
      this.personalDetails['state'] = data?.data?.state_name || '';
      this.personalDetails['city'] = data?.data?.district_name || '';
    },
    error: (err) => {
      console.error('Error fetching state/district:', err);
    }
  });
}
  employeeList: any = []
  cardData: any = {}
   loadEmployees() {

    this.employeeList = []


    this.employeeService.getEmp().subscribe((response: any) => {
      if (response && response.data && response.status === true) {

        this.employeeList = response.data?.formattedEmps?.map((item: any) => ({
          value: item.id,
          label: `${item?.empCode}-${item.firstName} ${item?.lastName || ''}`
        }));




      } else if (response.status === false) {
        this.notyf.error(response.message)
      }
      else if (response.status == 'expired') {
        this.router.navigate(['login'])
      }
    },
      (error: any) => {
        console.error('Error loading employees:', error);
        this.notyf.error(error?.error?.message)
        // alert('Failed to load employees. Please try again.');
      }
    );

  }
  departmentDD: any = []
   DepartmentDD() {
    this.departmentDD = []
   let obj:any={}
    this.Documentervice.Departmentsdd(obj).subscribe({
      next: (response: any) => {
        let message = response.message ? response.message : 'Data found Successfully';

        if (response.status === true) {
          this.departmentDD = response.data;
        console.log("department dropdown",this.departmentDD)
        }
        else if (response.status === "expired") {
          this.router.navigate(["login"]);
        }

        else {
          this.notyf.error(message)
        }

      },
      error: (err) => {
        console.error('Error:', err);
        this.notyf.error(err)
      }
    });
  }
  designationDD: any = []
  getDesignation(departmentId: any) {
    this.designationDD = []
    let obj: any = {}
    obj['department'] = departmentId?.value || departmentId
    this.Documentervice.designationDD(obj).subscribe({
      next: (response: any) => {
        console.log('response', response);

        let message = response.message ? response.message : 'Data found Successfully';

        if (response.status === true) {
          this.designationDD = response.data;
          console.log(this.designationDD,"designation data");

        }
        else if (response.status === "expired") {
          this.router.navigate(["login"]);
        }

        else {
          this.notyf.error(message)
        }

      },
      error: (err) => {
        console.error('Error:', err);
        this.notyf.error(err)
      }
    });
  }
  countryList: any = [];
  employmentTypes: any[] = [];
  async countrydd() {
    this.countryList = [];
    this.employeeService.getCountry().subscribe((data: any) => {
      if (Array.isArray(data)) {
        this.countryList = data;
        console.log(this.countryList);
      } else if (data && data.status === false) {
        alert(data.message);
        return;
      } else if (data && data.data) {
        this.countryList = data.data;
        console.log(this.countryList);
      }
    });
  }
  cities: any = []
  async getcity(stateId: any) {
    this.cities = [];
    let obj: any = {}
    obj['id'] = stateId.value || stateId;
    if (obj) {
      // Implement the logic to fetch cities based on the selected state
      this.employeeService.getCities(obj).subscribe(data => {
        this.cities = data.data || [];
        console.log(this.cities);
      });
    }
  }
  states: any[] = [];
  async getstates(countryId: any) {
    this.states = []
    let obj: any = {}
    obj['id'] = countryId.value || countryId;

    this.employeeService.getStates(obj).subscribe(data => {
      this.states = data.data || [];
      console.log(this.states);
    }

    );
  }
  toUppercase() {

  }
  @ViewChild('fileInput') fileInput!: ElementRef;
  addPhoto() {
    console.log("apii callled")
    const uploadData = new FormData();
    uploadData.append('id', this.personalDetails.id)
    uploadData.append('employeeId', this.personalDetails.id)
    uploadData.append('name', this.personalDetails.firstName)

    if (this.selectedFile) {
      uploadData.append('profileImage', this.selectedFile, this.selectedFile.name);
      // uploadData.append('image', this.selectedFile, this.selectedFile.name);
      // uploadData.append('file', this.selectedFile, this.selectedFile.name);
    } else {
      Swal.fire({
        toast: true,
        position: "top",
        showConfirmButton: false,
        icon: "warning",
        timer: 5000,
        title: "Select a file to upload",
      });
      return;
    }

    this.employeeService.uploadImage(uploadData).subscribe({
      next: (response: any) => {
        console.log('response', response);

        let message = response.message ? response.message : 'Data found Successfully';
        let status = this.statusService.handleResponseStatus(response.status, message);
        console.log(status)
        console.log("response", response);

        if (status === true) {
          this.notyf.success(message)
          this.selectedFile = null;
          this.fileInput.nativeElement.value = '';
          this.fetchDocument();
          // this.resetForm();
        }
        else if (status === "expired") {
          this.router.navigate(["login"]);
        }

        else {
          this.notyf.error(message)
        }

      },
      error: (err) => {
        console.error('Error:', err);
        this.notyf.error(err)
      }
    });


  }
  isFileInvalid: boolean = false;
  selectedFile: File | null = null;
  previewUrl: string | null = null;

  ngOnDestroy(): void {
    this.closeAdminCamera();
  }

  onFileChange(event: any): void {
    const file: File = event.target.files[0];

    if (!file) {
      this.selectedFile = null;
      return;
    }

    this.closeAdminCamera();

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
      this.notyf.error('Maximum allowed file size is 2MB.');
      event.target.value = ''; // Clear the file input
      this.selectedFile = null;
      return;
    }

    this.applySelectedFile(file);
    event.target.value = '';
  }

  private applySelectedFile(file: File): void {
    this.selectedFile = file;
    const reader = new FileReader();
    reader.onload = () => {
      this.previewUrl = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  async openAdminCamera(): Promise<void> {
    this.cameraError = null;
    this.cameraOpen = true;
    this.cameraBusy = false;
    await new Promise((r) => setTimeout(r, 50));
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Camera not supported in this browser.');
      }
      this.stopCameraStream();
      this.cameraStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 960 } },
      });
      const video = this.adminCameraVideo?.nativeElement;
      if (!video) throw new Error('Camera view not ready. Try again.');
      video.muted = true;
      video.playsInline = true;
      video.setAttribute('playsinline', 'true');
      video.srcObject = this.cameraStream;
      await video.play().catch(() => undefined);
    } catch (e: any) {
      this.cameraError = e?.message || 'Unable to open camera. Allow permission or use gallery.';
      this.stopCameraStream();
    }
  }

  closeAdminCamera(): void {
    this.stopCameraStream();
    this.cameraOpen = false;
    this.cameraBusy = false;
    this.cameraError = null;
  }

  private stopCameraStream(): void {
    if (this.cameraStream) {
      this.cameraStream.getTracks().forEach((t) => t.stop());
      this.cameraStream = null;
    }
    const video = this.adminCameraVideo?.nativeElement;
    if (video) video.srcObject = null;
  }

  async captureAdminPhoto(): Promise<void> {
    if (this.cameraBusy) return;
    this.cameraBusy = true;
    this.cameraError = null;
    try {
      const video = this.adminCameraVideo?.nativeElement;
      if (!video || !this.cameraStream || video.videoWidth < 2) {
        throw new Error('Camera not ready yet. Wait a moment and try again.');
      }
      const outW = 480;
      const outH = 640;
      const canvas = document.createElement('canvas');
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not capture frame.');

      const vw = video.videoWidth;
      const vh = video.videoHeight;
      const targetRatio = outW / outH;
      const srcRatio = vw / vh;
      let sx = 0;
      let sy = 0;
      let sw = vw;
      let sh = vh;
      if (srcRatio > targetRatio) {
        sw = Math.round(vh * targetRatio);
        sx = Math.round((vw - sw) / 2);
      } else {
        sh = Math.round(vw / targetRatio);
        sy = Math.round((vh - sh) / 2);
      }
      ctx.translate(outW, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, sx, sy, sw, sh, 0, 0, outW, outH);

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.9),
      );
      if (!blob) throw new Error('Capture failed.');
      const file = new File([blob], `live_${Date.now()}.jpg`, { type: 'image/jpeg' });
      if (file.size > 2 * 1024 * 1024) {
        throw new Error('Captured image is too large. Try again.');
      }
      this.applySelectedFile(file);
      this.closeAdminCamera();
      this.notyf.success('Photo captured. Click Submit to upload.');
    } catch (e: any) {
      this.cameraError = e?.message || 'Capture failed.';
      this.notyf.error(this.cameraError);
    } finally {
      this.cameraBusy = false;
    }
  }

  //   onFileChange(event: any) {
  //   const file = event.target.files[0];

  //   if (file && file.type.startsWith('image/')) {
  //     const img = new Image();
  //     const reader = new FileReader();

  //     reader.onload = (e: any) => {
  //       img.src = e.target.result;

  //       img.onload = async () => {
  //         const originalWidth = img.width;
  //         const originalHeight = img.height;

  //         const minWidth = 100;
  //         const minHeight = 100;
  //         const maxWidth = 1000;
  //         const maxHeight = 1000;

  //         if (
  //           originalWidth < minWidth ||
  //           originalHeight < minHeight ||
  //           originalWidth > maxWidth ||
  //           originalHeight > maxHeight
  //         ) {
  //           this.notyf.error(
  //             `Image dimensions should be between ${minWidth}x${minHeight} and ${maxWidth}x${maxHeight}px.`
  //           );
  //           event.target.value = '';
  //           return;
  //         }

  //         // Resize and compress to target dimensions
  //         const targetWidth = 200;
  //         const targetHeight = 200;
  //         const quality = 0.6; // 60% quality

  //         const compressedFile = await this.resizeAndCompressImage(
  //           img,
  //           targetWidth,
  //           targetHeight,
  //           quality
  //         );

  //         console.log('Compressed file:', compressedFile);

  //         // You can patch to a form or upload:
  //         // this.form.patchValue({ profileImage: compressedFile });
  //       };
  //     };

  //     reader.readAsDataURL(file);
  //   } else {
  //     this.notyf.error('Only image files are allowed.');
  //   }
  // }

  resizeAndCompressImage(
    img: HTMLImageElement,
    targetWidth: number,
    targetHeight: number,
    quality: number
  ): Promise<File> {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;

      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            const compressedFile = new File([blob], 'resized-image.jpg', {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          }
        },
        'image/jpeg',
        quality
      );
    });
  }


  DocumentList: any
  async fetchDocument() {
    this.DocumentList = []
    let obj: any = {}
    obj['id'] = this.personalDetails.id
    console.log(obj, "object data ")
    this.employeeService.getUploadImage(obj).subscribe(data => {
      if (data['status'] == true) {
        // this.notyf.success(data['message']);
        this.DocumentList = data.data;
        console.log(this.DocumentList);

        this.DocumentList = `${this.baseurl}/${this.DocumentList}`

      } else {
        this.notyf.error(data['message']);
      }
    });


  }
  openModal() {
    const modalElement = document.getElementById('imageModal');
    const modal = new bootstrap.Modal(modalElement!);
    modal.show();
  }
  back() {
    this.router.navigate(["/layout/employee/joining"]);
  }


  navigateToLeave() {
    this.router.navigate(['/layout/employee/add/profile/professional-info/assign-leave']);
  }
  navigateToSalarySetup() {
    this.router.navigate(['/layout/employee/add/profile/professional-info/salary-setup'])

  }

}
