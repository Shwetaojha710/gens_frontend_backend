import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HolidayTypeComponent } from './holiday-type.component';

describe('HolidayTypeComponent', () => {
  let component: HolidayTypeComponent;
  let fixture: ComponentFixture<HolidayTypeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HolidayTypeComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HolidayTypeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
