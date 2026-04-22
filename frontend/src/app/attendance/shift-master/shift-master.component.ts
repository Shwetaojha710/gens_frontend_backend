import { Component } from '@angular/core';
import { FormGroup, FormBuilder, Validators, FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Notyf } from 'notyf';
import Swal from 'sweetalert2';
import { MasterService } from '../../services/master.service';
import { StatusService } from '../../services/status.service';
import { ValidationUtil } from '../../shared/utils/validation.util';
import { CommonModule } from '@angular/common';
import { NgSelectModule } from '@ng-select/ng-select';

@Component({
  selector: 'app-shift-master',
  imports: [NgSelectModule,
    FormsModule, CommonModule],
  templateUrl: './shift-master.component.html',
  styleUrl: './shift-master.component.css'
})
export class ShiftMasterComponent {
  obj: any = {}
  notyf: Notyf;
  weekArr: any = [{ day_of_week: 'Sunday', startTime: '', endTime: '' }, { day_of_week: 'Monday', startTime: '', endTime: '' }, { day_of_week: 'Tuesday', startTime: '', endTime: '' }, { day_of_week: 'Wednesday', startTime: '', endTime: '' }, { day_of_week: 'Thursday', startTime: '', endTime: '' }, { day_of_week: 'Friday', startTime: '', endTime: '' }, { day_of_week: 'Saturday', startTime: '', endTime: '' }]
  weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  back() {
    this.obj = {}
    this.createFlag = false

  }
  status: any = [{ value: 'Day', label: 'Day' }, { value: 'Afternoon', label: 'Afternoon' }, { value: 'Night', label: 'Night' }]

  // onSubmit() {
  //    console.log(this.obj)
  // }
  departmentForm!: FormGroup;
  shiftList: any = [];
  editingId: number | null = null;

  constructor(
    private fb: FormBuilder,
    private shiftService: MasterService,
    public statusService: StatusService,
    private router: Router,
  ) {
    this.departmentForm = this.fb.group({
      name: ['', Validators.required],
      status: ['', [Validators.required]]
    });

    this.notyf = new Notyf();
  }

  async ngOnInit() {
    await this.fetchshifts();
  }
  getStatusClass(status: any): string {
    switch (status) {
      case 'pending': return 'bg-light-warning';
      case 'cancelled': return 'bg-light-danger';
      case 'completed': return 'badge bg-label-success';
      case 'Working': return 'badge bg-label-primary';
      case 'Week Off': return 'badge bg-label-secondary';
      case 'inactive': return 'bg-label-danger';
      case 'active': return 'bg-label-success';
      default: return 'bg-light-secondary';
    }
  }

  async fetchshifts() {
    this.shiftList = []
    this.shiftService.getshifts().subscribe(data => {
      if (data['status'] == true) {
        this.shiftList = []
        // this.notyf.success(data['message']);
        this.shiftList = data.data;
        this.shiftList = this.shiftList.map((item: any) => {
          return {
            ...item,
            shifts: item.shifts.map((shiftItem: any) => {
              return {
                ...shiftItem,
                is_week_off: shiftItem.is_week_off == false ? 'Working' : 'Week Off',
              };
            }),
          };
        });

      } else {
        this.notyf.error(data['message']);
      }
    });


  }

  onSubmit() {
    if (!ValidationUtil.showRequiredError('Shift Type', this.obj.shift, this.notyf)) {
      return;
    }

    // if (!ValidationUtil.showRequiredError('Start Time', this.obj.startTime, this.notyf)) {
    //   return;
    // }

    // if (!ValidationUtil.showRequiredError('End Time', this.obj.endTime, this.notyf)) {
    //   return;
    // }

    this.weekArr = this.weekArr.map((item: any) => {
      return {

        day_of_week: item.day_of_week,
        startTime: item.startTime,
        endTime: item.endTime,
        shift: this.obj['shift'],
      }
    })
    this.shiftService.createShift(this.weekArr).subscribe({
      next: (response: any) => {
        console.log('response', response);

        let message = response.message ? response.message : 'Data found Successfully';
        let status = this.statusService.handleResponseStatus(response.status, message);
        console.log(status)
        console.log("response", response);

        if (status === true) {

          this.notyf.success(message)
          this.fetchshifts();
          this.resetForm();
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
        this.notyf.error(err?.error?.message)
      }
    });

  }
  convertTo24Hour(time12h: string): string {
    const [time, modifier] = time12h.split(' ');

    let [hours, minutes] = time.split(':');
    let hh = parseInt(hours, 10);

    if (modifier === 'PM' && hh < 12) {
      hh += 12;
    }
    if (modifier === 'AM' && hh === 12) {
      hh = 0;
    }

    return `${hh.toString().padStart(2, '0')}:${minutes}`;
  }
  update(dept: any) {
    this.obj = Object.assign({}, dept)
    this.weekArr = dept.shifts
    console.log(this.obj)
    this.editingId = this.obj.id;
    this.weekArr = this.weekArr.map((item: any) => {
      return {
        ...item,
        startTime: this.convertTo24Hour(item.startTime),
        endTime: this.convertTo24Hour(item.endTime)
      }
    })
    this.createFlag = true
    this.updateFlag = true
  }
  updatedata() {
    this.weekArr = this.weekArr.map((item: any) => {
      return {

        day_of_week: item.day_of_week,
        startTime: item.startTime,
        endTime: item.endTime,
        shift: this.obj['shift'],
      }
    })
    this.weekArr['id'] = this.editingId
    this.shiftService.updateShift(this.editingId, this.weekArr).subscribe({
      next: (response: any) => {
        console.log('response', response);
        let message = response.message ? response.message : 'Data found Successfully';
        let status = this.statusService.handleResponseStatus(response.status, message);
        console.log(status)
        console.log("response", response);
        if (status === true) {
          this.notyf.success(message)
          this.fetchshifts();
          this.resetForm();
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



    })

  }

  delete(data: number) {

    Swal.fire({
      title: "Are you sure?",
      text: "Do you Want to Delete this",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete it!",
      cancelButtonText: "No, cancel!",
      reverseButtons: true
    }).then((result) => {
      if (result.isConfirmed) {
        this.deleteshift(data)
        // Swal.fire({
        //   title: "Deleted!",
        //   text: "Your file has been deleted.",
        //   icon: "success"
        // });
      } else if (
        /* Read more about handling dismissals below */
        result.dismiss === Swal.DismissReason.cancel
      ) {

      }
    });



  }
  deleteshift(data: any) {
    this.shiftService.deleteShift(data).subscribe({
      next: (response: any) => {
        console.log('response', response);
        let message = response.message ? response.message : 'Data found Successfully';
        let status = this.statusService.handleResponseStatus(response.status, message);
        console.log(status)
        console.log("response", response);
        if (status === true) {
          this.notyf.success(message)
          this.fetchshifts();
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
        this.notyf.error(err.message)
      }

    })
  }

  resetForm() {
    this.createFlag = false
    this.obj = {}
    this.editingId = null;
  }
  isInvalid(field: string): boolean {
    const control = this.departmentForm.get(field);
    return !!(control && control.touched && control.invalid);
  }

  createFlag: any = false
  listflag: any = true
  updateFlag: any = false
  opencreate() {
    this.obj = {}
    this.createFlag = true
    this.listflag = false
    this.updateFlag = false
     this.weekArr = this.weekArr.map((item: any) => {
      return {
        ...item,
        startTime: null,
        endTime: null
      }
    })
  }
formatTime(time: string): string {
  if (!time) return '';
  let [hour, minute] = time.split(':').map(Number);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12 || 12;  // Convert 0 -> 12 for midnight
  return `${hour}:${minute.toString().padStart(2, '0')} ${ampm}`;
}

}
