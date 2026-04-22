import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AttendanceUploadComponent } from './attendance-upload.component';

describe('AttendanceUploadComponent', () => {
  let component: AttendanceUploadComponent;
  let fixture: ComponentFixture<AttendanceUploadComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AttendanceUploadComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AttendanceUploadComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
