import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DateWiseAttendanceComponent } from './date-wise-attendance.component';

describe('DateWiseAttendanceComponent', () => {
  let component: DateWiseAttendanceComponent;
  let fixture: ComponentFixture<DateWiseAttendanceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DateWiseAttendanceComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DateWiseAttendanceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
