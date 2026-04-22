import { Component, ElementRef, ViewChild } from '@angular/core';
import { AttendanceService } from '../../services/attendance.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { Notyf } from 'notyf';
import { Router } from '@angular/router';
import { MasterService } from '../../services/master.service';
@Component({
  selector: 'app-attendance-upload',
  imports: [FormsModule, CommonModule, NgSelectModule,],
  templateUrl: './attendance-upload.component.html',
  styleUrl: './attendance-upload.component.css'
})
export class AttendanceUploadComponent {
  selectedFile?: any;
  rows: any[] = [];
  message = "";
  createFlag = true;

  notyf: Notyf | undefined;
  constructor(private attendanceService: AttendanceService, private router: Router, public master: MasterService) {
    this.notyf = new Notyf();
  }
  async ngOnInit() {
    await this.getYear();
  }

  async getYear() {
    this.yearList = [];

    // Get current year
    const currentYear = new Date().getFullYear();

    // If you want a range of years, e.g., last 5 years:
    for (let i = 0; i < 5; i++) {
      this.yearList.push(currentYear - i);
    }

    console.log('Available years:', this.yearList);

    // If you still want to fetch years from API:
    // this.master.getAttendanceYear().subscribe((data: any) => {
    //   console.log(data);
    //   if (data.status === true) {
    //     this.yearList = data.data;
    //   } else if (data.status === 'expired') {
    //     this.router.navigate(['login']);
    //   } else {
    //     // handle error
    //   }
    // });
  }

  async onFileSelected(event: any) {
    const file = event.target.files[0];

    if (file) {
      const allowedTypes = [
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ];

      if (!allowedTypes.includes(file.type)) {
        this.notyf?.error('Only Excel files (.xls, .xlsx) are allowed!');
        this.selectedFile = null;
        event.target.value = ''; // clear input
        return;
      }

      this.selectedFile = file;
      console.log('Excel file selected:', this.selectedFile);
    }
  }

  @ViewChild('fileInput') fileInput!: ElementRef;
  monthList = [
    { value: '01', label: 'January' },
    { value: '02', label: 'February' },
    { value: '03', label: 'March' },
    { value: '04', label: 'April' },
    { value: '05', label: 'May' },
    { value: '06', label: 'June' },
    { value: '07', label: 'July' },
    { value: '08', label: 'August' },
    { value: '09', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' }
  ];
  yearList: any = [];
  obj: any = {}
  onUpload() {
    if (!this.selectedFile) {
      this.message = "Please select an Excel file!";
      if (this.notyf) {
        this.notyf.error(this.message);
      }
      return;
    }
    // this.obj['data']=this.selectedFile
    const formData = new FormData();
    formData.append("file", this.selectedFile);
    formData.append("month", this.obj['month']); // <-- bind from dropdown
    formData.append("year", this.obj['year']);   // <-- bind from dropdown
    this.attendanceService.uploadFile(formData).subscribe({
      next: (res) => {
        this.message = "Excel uploaded successfully!";
        console.log(res);

        if (res['status'] == true) {
          if (this.notyf) {
            this.notyf.success(res['message']);
          }
          this.selectedFile = undefined;
          this.selectedFile = null;
          this.rows = res.rows; // parsed excel rows
          // reset the actual file input
          this.fileInput.nativeElement.value = '';
        }
        else if (res['status'] == 'expired') {
          localStorage.clear()
          this.router.navigate(['login']);
          // reset the actual file input
          this.fileInput.nativeElement.value = '';
        }
        else {
          if (this.notyf) {
            this.notyf.error(res['message']);
            // reset the actual file input
            this.fileInput.nativeElement.value = '';
          }
        }

      },
      error: (err) => {
        this.message = "Upload failed!";
        let errorMessage = err?.error?.message ? err?.error?.message : err?.message
        if (this.notyf) {
          this.fileInput.nativeElement.value = '';
          this.notyf.error(errorMessage);
        }
      }
    });
  }
  download() {
    if(!this.obj.year|| !this.obj.month){
      this.notyf?.error("Please select month and year");
      return
    }

    this.attendanceService.downloadAttendance(this.obj).subscribe({
      next: (blob) => {
        const file = new Blob([blob], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });
        const now = new Date();
        const fileName = `attendance_${now.getMonth() + 1}_${now.getFullYear()}.xlsx`;
        saveAs(file, fileName);
        console.log('File downloaded successfully');
      },
      error: (err) => {
        let errorMessage = err?.error?.message ? err?.error?.message : err?.message
        // this.notyf?.error(errorMessage);
        // console.error('Error downloading attendance file:', err);
        // this.message = 'Failed to download attendance. Please try again.';
        if (this.notyf) {
          this.notyf.error(errorMessage);
        }
      },
      complete: () => {
        this.notyf?.success('Download completed');
        // console.log('Download request completed');
      }
    });




    // const headers = [
    //   [
    //     "employeeId",
    //     "date",
    //     "check_in_time",
    //     "check_out_time",
    //     "is_present",
    //   ]
    // ];

    // // Create worksheet with headers only
    // const ws: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(headers);

    // // Create workbook
    // const wb: XLSX.WorkBook = XLSX.utils.book_new();
    // XLSX.utils.book_append_sheet(wb, ws, "AttendanceTemplate");

    // // Export
    // const excelBuffer: any = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    // const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
    // saveAs(blob, 'attendance_template.xlsx');
  }

}
