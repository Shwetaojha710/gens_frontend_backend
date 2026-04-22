import { Component, ElementRef, ViewChild } from '@angular/core';
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
// import { DocumentRendererComponent } from '../profile/document-renderer/document-renderer.component';

@Component({
  selector: 'app-add',
  standalone: true,
  imports: [CommonModule, FormsModule, AssignLeaveComponent, NgSelectModule, RouterModule, NdaComponent,QualificationComponent, ExperienceComponent,
     BankDetailsComponent,RelevingLetterComponent, BasicComponent, AllowancesComponent, TotalSalaryComponentComponent, DeductionsComponent, AssignLeaveComponent,OfferLetterComponent,ServiceAgreementComponent,AppointmentLetterComponent],
  templateUrl: './add.component.html',
  styleUrls: ['./add.component.css']
})
export class AddComponent {
  notyf: Notyf;
  personalDetails: any = {}
  constructor(private Documentervice: MasterService,
    private router: Router,
    private employeeService: EmployeeService, public dataService: DataService, public statusService: StatusService) {

    this.personalDetails = JSON.parse(localStorage.getItem('employeeId') || '{}');

    this.notyf = new Notyf();
    console.log(this.personalDetails, "personaldetails");

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
    await this.DepartmentDD()
    await this.getEmploymentTypes();
    await this.loadEmployees()
    await this.getDesignation(this.personalDetails.departmentId)
  }
  async getEmploymentTypes() {
    let obj:any={}
    this.employmentTypes = [];
    obj["branchId"]=this.personalDetails['branchId']
    this.Documentervice.getEmploymentTypes(obj).subscribe(data => {
      this.employmentTypes = data.data || [];
    });
  }
  employeeList: any = []
  cardData: any = {}
  async loadEmployees() {

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
  async DepartmentDD() {
    this.departmentDD = []
   let obj:any={}
    this.Documentervice.Departmentsdd(obj).subscribe({
      next: (response: any) => {
        let message = response.message ? response.message : 'Data found Successfully';

        if (response.status === true) {
          this.departmentDD = response.data;

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
