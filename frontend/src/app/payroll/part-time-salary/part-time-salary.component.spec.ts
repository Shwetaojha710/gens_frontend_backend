import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PartTimeSalaryComponent } from './part-time-salary.component';

describe('PartTimeSalaryComponent', () => {
  let component: PartTimeSalaryComponent;
  let fixture: ComponentFixture<PartTimeSalaryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PartTimeSalaryComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PartTimeSalaryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
