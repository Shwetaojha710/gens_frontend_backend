import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AppointmentLetterComponent } from './appointment-letter.component';

describe('AppointmentLetterComponent', () => {
  let component: AppointmentLetterComponent;
  let fixture: ComponentFixture<AppointmentLetterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppointmentLetterComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AppointmentLetterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
